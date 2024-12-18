document.addEventListener('DOMContentLoaded', () => {
    let IMAGE_BASE_URL;
    let columns = 3; // Default number of columns
    let imagesPerLoad = 10; // Default images per load
    const SCROLL_THRESHOLD = 100; // Scroll threshold to start hiding the header
    let currentImageRequest = null; // Variable to hold the current image request
    let currentImageIndex = 0; // Current image index for navigation
    let isLoading = false; // Flag to prevent multiple simultaneous loads
    let currentCategory = 'all'; // Current selected category
    let allImageUrls = []; // Store all image URLs

    // Fetch configuration from server
    fetch('/config')
        .then(response => response.json())
        .then(config => {
            IMAGE_BASE_URL = config.IMAGE_BASE_URL;
            // Proceed with the rest of the logic
            initGallery();
        })
        .catch(error => console.error('Error loading config:', error));

    function initGallery() {
        const galleryElement = document.getElementById('gallery');
        const loadingElement = document.getElementById('loading');
        let imageUrls = [];
        let currentIndex = 0;
        let imagesLoadedCount = 0;
        let loadingImagesCount = 0;
        let columnElements = [];

        // 获取图片的所有风格
        function getStylesBySize(images, size) {
            const styles = new Set();
            images.forEach(image => {
                const filename = image.original.split('/').pop();
                const parts = filename.split('-');
                if (parts[0] === size) {
                    styles.add(parts[1]); // 风格在第二部分
                }
            });
            return Array.from(styles);
        }

        // 自动识别所有尺寸类型
        function getAllSizes(images) {
            const sizes = new Set();
            images.forEach(image => {
                const filename = image.original.split('/').pop();
                const parts = filename.split('-');
                if (parts[0]) {
                    sizes.add(parts[0]); // 尺寸在第一部分
                }
            });
            return Array.from(sizes);
        }

        // 根据分类筛选图片
        function filterImagesByCategory(images, category) {
            if (category === 'all') return images;
            
            const [size, style] = category.split('-');
            return images.filter(image => {
                const filename = image.original.split('/').pop();
                const parts = filename.split('-');
                return parts[0] === size && parts[1] === style;
            });
        }

        // 动态生成分类导航
        function generateCategories() {
            // 在header的main-nav中添加分类按钮
            const mainNav = document.querySelector('.main-nav');
            mainNav.innerHTML = `
                <button class="category-btn active" data-category="all">All</button>
                <button class="category-btn size-btn" data-size="S">S</button>
                <button class="category-btn size-btn" data-size="M">M</button>
                <a href="https://qenifr.com" class="home-link">
                    <svg class="home-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </a>
            `;

            // 在sub-nav中只保留风格分类
            const subNavContent = document.querySelector('.sub-nav-content');
            subNavContent.innerHTML = `
                <div class="style-categories" style="display: none;">
                    <div class="style-buttons"></div>
                </div>
            `;

            // 绑定全部按钮事件
            const allButton = mainNav.querySelector('[data-category="all"]');
            allButton.addEventListener('click', () => {
                if (currentCategory === 'all') return;

                // 更新按钮状态
                updateButtonStates();
                allButton.classList.add('active');
                
                // 隐藏风格分类
                hideStyleCategories();

                // 重置分类和加载图片
                resetAndReloadGallery('all');
            });

            // 绑定尺寸按钮事件
            const sizeButtons = mainNav.querySelectorAll('.size-btn');
            sizeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const size = button.dataset.size;
                    
                    // 更新按钮状态
                    updateButtonStates();
                    button.classList.add('active');

                    // 显示该尺寸下的风格选项
                    showStyleCategories(size);
                });
            });
        }

        // 隐藏风格分类
        function hideStyleCategories() {
            const styleCategories = document.querySelector('.style-categories');
            styleCategories.style.display = 'none';
            document.querySelector('.gallery').style.marginTop = '60px';
        }

        // 显示风格分类
        function showStyleCategories(size) {
            const styleCategories = document.querySelector('.style-categories');
            const styleButtons = styleCategories.querySelector('.style-buttons');
            
            // 获取该尺寸下的所有风格
            const styles = ['Hand Painted', 'Crafts', 'Ornaments'];
            
            // 生成风格按钮
            styleButtons.innerHTML = '';
            styles.forEach(style => {
                const button = document.createElement('button');
                button.className = 'category-btn style-btn';
                button.textContent = style;
                button.addEventListener('click', () => {
                    // 更新风格按钮状态
                    styleButtons.querySelectorAll('.style-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    button.classList.add('active');
                    
                    // 重置分类和加载图片
                    resetAndReloadGallery(`${size}-${style}`);
                });
                styleButtons.appendChild(button);
            });
            
            // 显示风格分类
            styleCategories.style.display = 'block';
            document.querySelector('.gallery').style.marginTop = '120px';
        }

        // 重置画廊并重新加载图片
        function resetAndReloadGallery(category) {
            currentCategory = category;
            currentIndex = 0;
            imagesLoadedCount = 0;
            isLoading = false;
            
            // 清空画廊
            columnElements.forEach(column => column.innerHTML = '');
            
            // 筛选并加载图片
            imageUrls = filterImagesByCategory(allImageUrls, category);
            loadNextImages();
        }

        // 更新所有按钮状态
        function updateButtonStates() {
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        }

        // 创建列元素
        function createColumns() {
            columnElements.forEach(column => galleryElement.removeChild(column));
            columnElements = [];
            for (let i = 0; i < columns; i++) {
                const column = document.createElement('div');
                column.classList.add('column');
                columnElements.push(column);
                galleryElement.appendChild(column);
            }
        }

        function updateColumns() {
            const width = window.innerWidth;
            if (width < 600) {
                columns = 2;
                imagesPerLoad = 10;
            } else if (width < 900) {
                columns = 3;
                imagesPerLoad = 15;
            } else if (width < 1200) {
                columns = 4;
                imagesPerLoad = 20;
            } else if (width < 1500) {
                columns = 5;
                imagesPerLoad = 23;
            } else {
                columns = 6;
                imagesPerLoad = 25;
            }
            createColumns();
            distributeImages();
        }

        function distributeImages() {
            if (!Array.isArray(imageUrls)) {
                console.error('imageUrls is not an array:', imageUrls);
                return;
            }
            
            columnElements.forEach(column => column.innerHTML = '');
            const imagesToShow = imageUrls.slice(0, currentIndex);
            console.log(`Distributing ${imagesToShow.length} images`);
            
            imagesToShow.forEach((imageUrl, index) => {
                if (!imageUrl || !imageUrl.thumbnail) {
                    console.error('Invalid image URL at index', index, imageUrl);
                    return;
                }
                const img = document.createElement('img');
                img.src = imageUrl.thumbnail;
                img.alt = `Photo ${index + 1}`;
                img.classList.add('loaded');
                img.onclick = () => openModal(imageUrl.original, index);
                columnElements[index % columns].appendChild(img);
            });
        }

        // 从服务器获取所有图片 URL
        fetch('/images')
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        throw new Error(err.details || 'Failed to load images');
                    });
                }
                return response.json();
            })
            .then(urls => {
                console.log('Received image URLs:', urls);
                if (!Array.isArray(urls)) {
                    console.error('Received non-array response:', urls);
                    return;
                }
                allImageUrls = urls;
                imageUrls = urls;
                generateCategories();
                updateColumns();
                loadNextImages();
            })
            .catch(error => {
                console.error('Error loading images:', error);
                // 显示错误信息给用户
                const gallery = document.getElementById('gallery');
                gallery.innerHTML = `<div class="error-message">Failed to load images: ${error.message}</div>`;
            });

        // 取最短列的索引
        function getShortestColumn() {
            let minIndex = 0;
            let minHeight = columnElements[0].offsetHeight;
            for (let i = 1; i < columnElements.length; i++) {
                if (columnElements[i].offsetHeight < minHeight) {
                    minHeight = columnElements[i].offsetHeight;
                    minIndex = i;
                }
            }
            return minIndex;
        }

        // 加载下一批图片
        function loadNextImages() {
            if (isLoading || currentIndex >= imageUrls.length) return;
            
            isLoading = true;
            loadingElement.style.display = 'block';
            const endIndex = Math.min(currentIndex + imagesPerLoad, imageUrls.length);
            loadingImagesCount = endIndex - currentIndex;

            for (let i = currentIndex; i < endIndex; i++) {
                const img = document.createElement('img');
                img.src = imageUrls[i].thumbnail;
                img.alt = `Photo ${i + 1}`;
                img.onload = function () {
                    this.classList.add('loaded'); // Add loaded class when image is loaded
                    const shortestColumn = getShortestColumn();
                    columnElements[shortestColumn].appendChild(img);
                    imagesLoadedCount++;
                    loadingImagesCount--;
                    if (loadingImagesCount === 0) {
                        isLoading = false;
                        loadingElement.style.display = 'none';
                        checkIfAllImagesLoaded();
                    }
                };
                img.onclick = function () {
                    openModal(imageUrls[i].original, i);
                };
                img.onerror = () => {
                    console.error(`Error loading image: ${imageUrls[i].thumbnail}`);
                    loadingImagesCount--;
                    if (loadingImagesCount === 0) {
                        isLoading = false;
                        loadingElement.style.display = 'none';
                        checkIfAllImagesLoaded();
                    }
                };
            }
            currentIndex = endIndex;
        }

        // 检查是否所有图片都加载完成
        function checkIfAllImagesLoaded() {
            const totalImagesToLoad = Math.min(currentIndex, imageUrls.length);
            if (imagesLoadedCount >= totalImagesToLoad) {
                document.querySelector('.gallery').style.opacity = '1'; // Show gallery
            }
        }

        // 模态窗口逻辑
        const modal = document.getElementById('myModal');
        const modalContent = document.querySelector('.modal-content');
        const modalImg = document.getElementById('img01');
        const imageName = document.getElementById('image-name');
        const span = document.getElementsByClassName('close')[0];
        const prevBtn = document.querySelector('.prev-btn');
        const nextBtn = document.querySelector('.next-btn');

        function openModal(src, index) {
            currentImageIndex = index;
            updateModalImage(src);
            modal.style.display = 'block';
            document.body.classList.add('no-scroll');
            updateNavigationButtons();
        }

        function updateModalImage(src) {
            // Cancel any ongoing image request
            if (currentImageRequest) {
                currentImageRequest.abort();
            }

            // Create a new AbortController for the current request
            const imageController = new AbortController();
            currentImageRequest = imageController;

            // Load the image
            modalImg.src = src;
            modalImg.onload = () => {
                if (!imageController.signal.aborted) {
                    currentImageRequest = null; // Clear the current image request when loaded
                }
            };
            modalImg.onerror = () => {
                if (!imageController.signal.aborted) {
                    console.error('Error loading image');
                }
            };

            // 显示图片文件名和固定文本
            const filename = src.split('/').pop();
            imageName.innerHTML = `
                <p style="margin-bottom: 8px;">${filename}</p>
                <p style="color: #999; font-size: 0.9em;">Images from the Internet</p>
            `;
        }

        function updateNavigationButtons() {
            prevBtn.style.display = currentImageIndex > 0 ? 'block' : 'none';
            nextBtn.style.display = currentImageIndex < imageUrls.length - 1 ? 'block' : 'none';
        }

        prevBtn.onclick = function(event) {
            event.stopPropagation(); // 阻止事件冒泡
            if (currentImageIndex > 0) {
                currentImageIndex--;
                updateModalImage(imageUrls[currentImageIndex].original);
                updateNavigationButtons();
            }
        }

        nextBtn.onclick = function(event) {
            event.stopPropagation(); // 阻止事件冒泡
            if (currentImageIndex < imageUrls.length - 1) {
                currentImageIndex++;
                // 如果到达当前加载的尾,自动加载更多
                if (currentImageIndex >= currentIndex && currentIndex < imageUrls.length) {
                    loadNextImages();
                }
                updateModalImage(imageUrls[currentImageIndex].original);
                updateNavigationButtons();
            }
        }

        span.onclick = function () {
            closeModal();
        }

        modalContent.onclick = function (event) {
            event.stopPropagation(); // Prevent click on image from closing modal
        }

        modal.onclick = function () {
            closeModal();
        }

        function closeModal() {
            // Abort any ongoing image request when closing the modal
            if (currentImageRequest) {
                currentImageRequest.abort();
            }
            modal.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }

        // 键盘导航
        document.addEventListener('keydown', function (event) {
            if (modal.style.display === 'block') {
                switch(event.key) {
                    case 'ArrowLeft':
                        prevBtn.click();
                        break;
                    case 'ArrowRight':
                        nextBtn.click();
                        break;
                    case 'Escape':
                        closeModal();
                        break;
                }
            }
        });

        window.addEventListener('resize', () => {
            updateColumns(); // Update columns on window resize
            distributeImages(); // Re-distribute images
            setGalleryMarginTop(); // Update gallery margin-top on window resize
        });

        // 动态设置 gallery 的 margin-top
        function setGalleryMarginTop() {
            const headerHeight = document.querySelector('header').offsetHeight;
            const subNav = document.getElementById('category-nav');
            const subNavHeight = subNav && subNav.classList.contains('show') ? subNav.offsetHeight : 0;
            galleryElement.style.marginTop = `${headerHeight + subNavHeight + 20}px`;
        }

        updateColumns(); // Initial column setup
        setGalleryMarginTop(); // Initial gallery margin-top setup

        // Hide header on scroll and handle infinite scroll
        let scrollTimeout;

        window.addEventListener('scroll', () => {
            // Infinite scroll logic with throttling
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                const scrollPosition = window.innerHeight + window.scrollY;
                const totalHeight = document.body.offsetHeight;
                const scrollThreshold = totalHeight - window.innerHeight - 500; // Load more when 500px from bottom

                if (scrollPosition > scrollThreshold && !isLoading) {
                    loadNextImages();
                }
            }, 100); // Throttle scroll events to every 100ms
        });
    }
});