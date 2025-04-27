/**
 * AI POS System - Frontend Script
 * Handles UI interactions, state management (in-memory),
 * and rendering for products, orders, and tracking visualizations.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Get DOM Elements ---
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const currentDateTime = document.getElementById('current-date-time');
    const addProductFab = document.getElementById('add-product-fab');
    const closeDayBtn = document.getElementById('close-day-btn'); // Opens receipt modal

    // Modals
    const addProductModal = document.getElementById('add-product-modal');
    const updateStockModal = document.getElementById('update-stock-modal');
    const dailyReceiptModal = document.getElementById('daily-receipt-modal');
    const quantityModal = document.getElementById('quantity-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');

    // Product Grid Container (within POS view)
    const productGrid = document.getElementById('product-grid');

    // Order Summary Drawer
    const orderDrawer = document.getElementById('order-summary-drawer');
    const orderItemsList = document.getElementById('order-items');
    const orderTotalAmount = document.getElementById('order-total-amount');
    const completeSaleBtn = document.getElementById('complete-sale-btn');
    const toggleDrawerBtnOpen = document.getElementById('toggle-drawer-btn-open');
    const toggleDrawerBtnClose = document.getElementById('toggle-drawer-btn-close');

    // Forms
    const addProductForm = document.getElementById('add-product-form');
    const updateStockForm = document.getElementById('update-stock-form');
    const quantityForm = document.getElementById('quantity-form');

    // --- Get DOM Elements (Tracking Additions) ---
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const trackingView = document.getElementById('tracking-view');

    // Chart Canvases & Table Body
    const salesPieChartCanvas = document.getElementById('salesPieChart');
    const salesLineChartCanvas = document.getElementById('salesLineChart');
    const topProductsTableBody = document.querySelector('#topProductsTable tbody');

     // KPI Spans
     const metricTotalSales = document.getElementById('metric-total-sales');
     const metricTotalRevenue = document.getElementById('metric-total-revenue');
     const metricAvgSale = document.getElementById('metric-avg-sale');

    // Chart instances (to prevent duplicates and allow updates)
    let salesPieChartInstance = null;
    let salesLineChartInstance = null;


    // --- State Variables ---
    let currentOrder = []; // Array to hold items in the current order {id, name, price, quantity}
    let productIdCounter = 3; // Start after sample items (using prefix now)
    let salesHistory = []; // To store completed sales {id, items:[{id, name, price, quantity, cost}], total, timestamp}
    let products = {}; // Central store for product details: { id: { name, price, cost, stock } }

    // --- Functions ---

    /**
     * Updates the date and time display in the top bar.
     */
    function updateTime() {
        const now = new Date();
        // Use locale 'en-US' for consistency or remove for system default
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
        try {
            currentDateTime.textContent = now.toLocaleString(undefined, options); // Use system locale
        } catch (e) { // Fallback for specific environment issues
             currentDateTime.textContent = now.toLocaleString();
        }
    }

    /**
     * Toggles the color theme between light and dark mode.
     * Refreshes tracking charts if the tracking tab is active.
     */
    function toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        // Optional: Save theme preference in localStorage
        // localStorage.setItem('theme', newTheme);
        console.log(`Theme changed to ${newTheme}`);

        // Regenerate charts if tracking view is active to update colors
        if (trackingView && trackingView.classList.contains('active')) {
             // Small delay to ensure theme styles are applied before redrawing
             setTimeout(generateTrackingVisuals, 50);
        }
    }

     /**
      * Loads the theme preference from localStorage (Optional).
      */
     /*
     function loadTheme() {
         const savedTheme = localStorage.getItem('theme');
         if (savedTheme) {
             document.body.setAttribute('data-theme', savedTheme);
         } else { // Default to light if nothing saved
             document.body.setAttribute('data-theme', 'light');
         }
     }
     // loadTheme(); // Call on page load if using localStorage
     */

    // --- Modal Handling ---

    /**
     * Opens a specified modal dialog.
     * @param {HTMLDialogElement} modalElement - The dialog element to open.
     */
    function openModal(modalElement) {
        if (modalElement && typeof modalElement.showModal === 'function') {
            modalElement.showModal();
        } else {
            console.error("Modal element not found or doesn't support showModal():", modalElement);
        }
    }

    /**
     * Closes a specified modal dialog.
     * @param {HTMLDialogElement} modalElement - The dialog element to close.
     */
    function closeModal(modalElement) {
         if (modalElement && typeof modalElement.close === 'function') {
            modalElement.close();
        } else {
             console.error("Modal element not found or doesn't support close():", modalElement);
        }
    }

    // Add event listeners to all designated close buttons within modals
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Find the closest dialog parent to the button
            const modalToClose = btn.closest('dialog');
            if (modalToClose) {
                closeModal(modalToClose);
            } else {
                console.warn("Could not find parent dialog for close button:", btn);
            }
        });
    });

    // Add event listeners to close modals when clicking on the backdrop
    document.querySelectorAll('dialog.modal').forEach(modal => {
         modal.addEventListener('click', (event) => {
             // Check if the click is directly on the dialog element (the backdrop)
             if (event.target === modal) {
                 closeModal(modal);
             }
         });
         // Optional: Close on 'Escape' key (often default behavior, but explicit handling is safer)
         modal.addEventListener('keydown', (event) => {
             if (event.key === 'Escape') {
                 closeModal(modal);
             }
         });
     });


    // --- Product Functions ---

     /**
      * Adds or updates product details in the central 'products' object.
      * @param {object} product - The product object { id, name, price, cost, stock }.
      */
     function storeProductDetails(product) {
         if (product && product.id) {
            products[product.id] = product;
         } else {
            console.error("Attempted to store invalid product details:", product);
         }
     }

    /**
     * Renders or updates a single product tile in the grid based on product data.
     * @param {object} product - The product object { id, name, price, cost, stock }.
     */
    function renderProductTile(product) {
         if (!productGrid || !product || !product.id) {
             console.error("Cannot render product tile. Grid or product data invalid.", productGrid, product);
             return;
         }
         let tile = productGrid.querySelector(`.product-tile[data-id='${product.id}']`);

         // Update existing tile if found
         if (tile) {
             tile.dataset.name = product.name;
             tile.dataset.price = product.price;
             tile.dataset.stock = product.stock;
             tile.querySelector('.tile-name').textContent = product.name;
             tile.querySelector('.tile-price').textContent = `$${parseFloat(product.price).toFixed(2)}`;
             tile.querySelector('.tile-stock').textContent = `Stock: ${product.stock}`;
         } else {
             // Create new tile if not found
             tile = document.createElement('div');
             tile.classList.add('product-tile');
             tile.dataset.id = product.id;
             tile.dataset.name = product.name;
             tile.dataset.price = product.price;
             tile.dataset.stock = product.stock;
             // Store cost on dataset too if needed, though reading from 'products' object is better
             // tile.dataset.cost = product.cost;

             tile.innerHTML = `
                <div class="tile-info">
                    <span class="tile-name">${product.name}</span>
                    <span class="tile-price">$${parseFloat(product.price).toFixed(2)}</span>
                </div>
                <div class="tile-stock">Stock: ${product.stock}</div>
                <div class="tile-actions">
                     <button class="update-stock-btn" title="Update Stock"><i class="fas fa-edit"></i> Stock</button>
                </div>
            `;

            // Add event listener for adding to order (only add once on creation)
            tile.addEventListener('click', (e) => {
                 if (!e.target.closest('.update-stock-btn')) {
                     const currentProductData = products[product.id]; // Read fresh data
                     if (currentProductData && currentProductData.stock > 0) {
                        handleProductTileClick(currentProductData);
                     } else if (currentProductData) {
                        console.log(`Product ${product.name} is out of stock.`);
                        tile.classList.add('shake-animation');
                        setTimeout(() => tile.classList.remove('shake-animation'), 500);
                     }
                 }
            });

             // Add event listener for update stock button within the tile
             tile.querySelector('.update-stock-btn').addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent tile click event propagating
                  const currentProductData = products[product.id]; // Read fresh data
                  if (currentProductData) {
                     openUpdateStockModal(currentProductData);
                  }
             });

            productGrid.appendChild(tile);
         }

         // Update stock visual state (low stock, out of stock)
         updateTileStockStatus(tile, product.stock);
    }

     /**
      * Updates visual cues on a product tile based on stock level.
      * @param {HTMLElement} tileElement - The product tile element.
      * @param {number} stock - The current stock quantity.
      */
     function updateTileStockStatus(tileElement, stock) {
        if (!tileElement) return;
        tileElement.classList.remove('low-stock', 'out-of-stock');
         if (stock <= 0) {
             tileElement.classList.add('out-of-stock');
         } else if (stock <= 5) { // Example low stock threshold (could be configurable)
             tileElement.classList.add('low-stock');
         }
     }

    /**
     * Handles the submission of the "Add Product" form.
     * Creates a new product, stores it, renders it, and closes the modal.
     * @param {Event} event - The form submission event.
     */
    function handleAddProduct(event) {
        event.preventDefault();
        const name = document.getElementById('product-name').value.trim();
        const price = parseFloat(document.getElementById('product-price').value);
        const cost = parseFloat(document.getElementById('product-cost').value);
        const stock = parseInt(document.getElementById('product-stock').value);

        // Basic validation
        if (name && !isNaN(price) && price >= 0 && !isNaN(cost) && cost >= 0 && !isNaN(stock) && stock >= 0) {
            const newProduct = {
                id: `prod-${productIdCounter++}`, // Use a prefix for clarity
                name: name,
                price: price,
                cost: cost,
                stock: stock
            };
            storeProductDetails(newProduct); // Store details centrally
            renderProductTile(newProduct);    // Render the tile on UI
            addProductForm.reset();
            closeModal(addProductModal);
            console.log('Product added:', newProduct);
        } else {
            alert('Please fill in all fields with valid, non-negative values.');
        }
    }

    /**
     * Opens the "Update Stock" modal pre-filled with the product's details.
     * @param {object} product - The product object { id, name, stock }.
     */
     function openUpdateStockModal(product) {
         if (!product) return;
         document.getElementById('update-stock-product-id').value = product.id;
         document.getElementById('update-stock-product-name').textContent = `Update Stock for ${product.name}`;
         document.getElementById('update-stock-quantity').value = product.stock; // Pre-fill current stock
         document.getElementById('update-stock-quantity').min = 0; // Ensure stock cannot be negative
         openModal(updateStockModal);
     }

    /**
     * Handles the submission of the "Update Stock" form.
     * Updates the product's stock in the central store and re-renders the tile.
     * @param {Event} event - The form submission event.
     */
    function handleUpdateStock(event) {
         event.preventDefault();
         const productId = document.getElementById('update-stock-product-id').value;
         const newStock = parseInt(document.getElementById('update-stock-quantity').value);

         if (products[productId] && !isNaN(newStock) && newStock >= 0) {
             products[productId].stock = newStock; // Update central data store

             const productTile = productGrid.querySelector(`.product-tile[data-id='${productId}']`);
             if(productTile) {
                 renderProductTile(products[productId]); // Re-render tile to update stock display and status
             } else {
                 console.warn(`Tile for product ID ${productId} not found, but stock data was updated.`);
             }

             console.log(`Stock updated for product ID ${productId} to ${newStock}`);
             updateStockForm.reset();
             closeModal(updateStockModal);
         } else {
             alert('Invalid stock quantity or product not found.');
         }
     }


    // --- Order Summary / Drawer Functions ---

    /**
     * Toggles the visibility of the order summary drawer, adapting for mobile/desktop.
     */
     function toggleDrawer() {
        // Determine if drawer should be considered 'open' based on class or desktop visibility
        const isCurrentlyVisible = orderDrawer.classList.contains('open') || (window.innerWidth > 768 && !orderDrawer.classList.contains('closed'));

        if (window.innerWidth <= 768) {
             // On mobile, toggle the 'open' class for slide animation
             orderDrawer.classList.toggle('open');
             // Show/hide the external 'View Order' button accordingly
             toggleDrawerBtnOpen.style.display = orderDrawer.classList.contains('open') ? 'none' : 'block';
        } else {
             // On desktop, toggle the 'closed' class to hide/show
             orderDrawer.classList.toggle('closed');
        }
     }

    // Add event listeners for both the external open button and internal close button
    if(toggleDrawerBtnOpen) toggleDrawerBtnOpen.addEventListener('click', toggleDrawer);
    if(toggleDrawerBtnClose) toggleDrawerBtnClose.addEventListener('click', toggleDrawer);


    /**
     * Handles clicks on a product tile to initiate adding it to the order.
     * Opens the quantity modal if the product is in stock.
     * @param {object} product - The product object { id, name, price, stock }.
     */
    function handleProductTileClick(product) {
        if (!product) return;

        // Check stock again right before opening modal
        if(product.stock <= 0) {
             console.log(`Cannot add ${product.name}, it is out of stock.`);
             const tile = productGrid.querySelector(`.product-tile[data-id='${product.id}']`);
             if (tile) { // Provide visual feedback if tile exists
                 tile.classList.add('shake-animation');
                 setTimeout(() => tile.classList.remove('shake-animation'), 500);
             }
             return; // Don't open modal if out of stock
        }

        // Open quantity modal and pre-fill details
        document.getElementById('quantity-product-id').value = product.id;
        document.getElementById('quantity-product-name').textContent = `Quantity for ${product.name}`;
        document.getElementById('quantity-product-price').value = product.price;
        document.getElementById('quantity-product-stock').value = product.stock;
        const quantityInput = document.getElementById('quantity-input');
        quantityInput.value = 1; // Default to 1
        quantityInput.max = product.stock; // Set max based on available stock
        quantityInput.min = 1; // Minimum quantity is 1
        openModal(quantityModal);
    }

    /**
     * Handles the submission of the quantity modal form.
     * Adds the specified quantity of the item to the current order.
     * @param {Event} event - The form submission event.
     */
     function handleQuantitySubmit(event) {
         event.preventDefault();
         const productId = document.getElementById('quantity-product-id').value;
         const product = products[productId]; // Get full product details from central store
         const quantity = parseInt(document.getElementById('quantity-input').value);

         if (!product) {
             alert("Error: Product details not found. Cannot add to order.");
             return;
         }

         // Validate quantity input
         if (isNaN(quantity) || quantity <= 0) {
             alert("Please enter a valid quantity greater than zero.");
             return;
         }
         if (quantity > product.stock) {
             alert(`Cannot add ${quantity}. Only ${product.stock} of ${product.name} in stock.`);
             return;
         }

         addItemToOrder(product.id, product.name, product.price, quantity);
         closeModal(quantityModal);
         quantityForm.reset();

         // Automatically open the order drawer on mobile if an item is added and it's closed
         if (window.innerWidth <= 768 && !orderDrawer.classList.contains('open')) {
             toggleDrawer();
         }
     }

    /**
     * Adds an item to the `currentOrder` array or updates its quantity if already present.
     * Checks against available stock before updating quantity.
     * @param {string} id - Product ID.
     * @param {string} name - Product Name.
     * @param {number} price - Product Price.
     * @param {number} quantity - Quantity to add.
     */
    function addItemToOrder(id, name, price, quantity) {
        const existingItemIndex = currentOrder.findIndex(item => item.id === id);
        const productStock = products[id] ? products[id].stock : 0;

        if (existingItemIndex > -1) {
            // If item exists, check if adding more exceeds stock
            const potentialNewQuantity = currentOrder[existingItemIndex].quantity + quantity;
             if (potentialNewQuantity > productStock) {
                 // Calculate how many *can* be added
                 const canAdd = productStock - currentOrder[existingItemIndex].quantity;
                 if (canAdd > 0) {
                     alert(`Cannot add ${quantity} more. Only ${canAdd} additional ${name} available in stock. Adding ${canAdd}.`);
                     currentOrder[existingItemIndex].quantity += canAdd;
                 } else {
                      alert(`Cannot add more ${name}. Already have maximum stock (${productStock}) in order.`);
                      return; // Stop if cannot add any more
                 }
             } else {
                currentOrder[existingItemIndex].quantity = potentialNewQuantity; // Update quantity
             }
        } else {
            // If item is new, ensure requested quantity doesn't exceed stock
             if (quantity > productStock) {
                  alert(`Cannot add ${quantity} of ${name}. Only ${productStock} available in stock. Adding ${productStock}.`);
                  currentOrder.push({ id, name, price, quantity: productStock }); // Add with max available stock
             } else {
                currentOrder.push({ id, name, price, quantity }); // Add new item
             }
        }
        updateOrderSummary(); // Refresh the order display
    }

    /**
     * Removes an item completely from the `currentOrder` array.
     * @param {string} id - The ID of the product to remove.
     */
    function removeItemFromOrder(id) {
        currentOrder = currentOrder.filter(item => item.id !== id);
        updateOrderSummary(); // Refresh the order display
    }

    /**
     * Updates the order summary UI based on the `currentOrder` array.
     * Calculates and displays the total amount.
     */
    function updateOrderSummary() {
        if (!orderItemsList) return; // Exit if element not found
        orderItemsList.innerHTML = ''; // Clear current list
        let total = 0;

        if (currentOrder.length === 0) {
             // Display a message when the order is empty
             const emptyMsg = document.createElement('li');
             emptyMsg.className = 'empty-order-msg';
             emptyMsg.textContent = 'Order is empty';
             orderItemsList.appendChild(emptyMsg);
        } else {
            // Populate list with current order items
            currentOrder.forEach(item => {
                const listItem = document.createElement('li');
                listItem.dataset.id = item.id; // Store id on the list item for potential actions
                listItem.innerHTML = `
                    <span>${item.name} (x${item.quantity})</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    <button class="remove-item-btn" title="Remove Item">X</button>
                `;
                // Add event listener to the remove button for this item
                 listItem.querySelector('.remove-item-btn').addEventListener('click', () => {
                    removeItemFromOrder(item.id);
                });

                orderItemsList.appendChild(listItem);
                total += item.price * item.quantity; // Accumulate total
            });
        }

        // Update the total amount display
        if (orderTotalAmount) {
            orderTotalAmount.textContent = total.toFixed(2);
        }
    }

    /**
     * Handles the "Complete Sale" button click.
     * Updates stock, records the sale in history, clears the current order,
     * and provides user feedback. Refreshes tracking if active.
     */
    function handleCompleteSale() {
        if (currentOrder.length === 0) {
            showTemporaryFeedback("Order is empty. Add items first.", "error");
            return;
        }

        // 1. Update stock in the central 'products' object AND visually on tiles
        currentOrder.forEach(orderItem => {
            if (products[orderItem.id]) {
                const currentStock = products[orderItem.id].stock;
                const newStock = Math.max(0, currentStock - orderItem.quantity);
                products[orderItem.id].stock = newStock; // Update central data

                // Update the corresponding tile visually by re-rendering it
                const productTile = productGrid.querySelector(`.product-tile[data-id='${orderItem.id}']`);
                if (productTile) {
                     renderProductTile(products[orderItem.id]); // Re-render with updated stock/status
                }
            } else {
                // This case should ideally not happen if products are managed correctly
                console.warn(`Product with ID ${orderItem.id} from order not found in central 'products' list during stock update.`);
            }
        });

         // 2. Record the sale in history, including cost data for profit calculation
         const saleItemsWithCost = currentOrder.map(item => {
             const productDetails = products[item.id];
             // Ensure cost is a number, default to 0 if not found or invalid
             const cost = (productDetails && typeof productDetails.cost === 'number' && !isNaN(productDetails.cost))
                          ? productDetails.cost
                          : 0;
             return { ...item, cost: cost }; // Include cost in the saved item data
         });

        const sale = {
            id: `SALE-${Date.now()}`, // Simple unique ID based on timestamp
            items: saleItemsWithCost, // Store items including their cost at time of sale
            total: parseFloat(orderTotalAmount.textContent), // Get total from UI
            timestamp: new Date() // Record time of sale
        };
        salesHistory.push(sale); // Add to the history array
        console.log("Sale completed and recorded:", sale);
        // console.log("Current Sales History:", salesHistory); // For debugging

        // 3. Clear the current order UI and state variable
        currentOrder = [];
        updateOrderSummary(); // Update UI to show empty order

        // 4. Optional: Close drawer on mobile after sale completion
        if (window.innerWidth <= 768 && orderDrawer.classList.contains('open')) {
            toggleDrawer();
        }

        // 5. Provide non-blocking user feedback
        showTemporaryFeedback("Sale Completed!", "success");

        // 6. If tracking view is currently active, refresh its data
         if (trackingView && trackingView.classList.contains('active')) {
             generateTrackingVisuals();
             afterDataChange(); // Call to update charts and metrics after data change
         }
    }

     /**
      * Displays a temporary feedback message popup at the bottom of the screen.
      * @param {string} message - The message to display.
      * @param {string} [type='info'] - Type of message ('info', 'success', 'error') for styling.
      */
     function showTemporaryFeedback(message, type = 'info') {
         const feedbackDiv = document.createElement('div');
         feedbackDiv.className = `feedback-popup ${type}`;
         feedbackDiv.textContent = message;
         document.body.appendChild(feedbackDiv);

         // Basic styling (can be moved to CSS for better management)
         Object.assign(feedbackDiv.style, {
             position: 'fixed',
             bottom: '20px',
             left: '50%',
             transform: 'translateX(-50%)',
             padding: '12px 25px',
             borderRadius: '6px',
             zIndex: '2000',
             transition: 'opacity 0.4s ease-out, bottom 0.4s ease-out',
             opacity: '0', // Start hidden
             boxShadow: '0 3px 8px rgba(0,0,0,0.2)',
             fontSize: '1em',
             textAlign: 'center'
         });

         // Type-specific styling
         if(type === 'success') {
             feedbackDiv.style.backgroundColor = 'var(--success-color, #28a745)'; // Use variable or fallback
             feedbackDiv.style.color = 'white';
         } else if (type === 'error') {
             feedbackDiv.style.backgroundColor = 'var(--danger-color, #dc3545)';
             feedbackDiv.style.color = 'white';
         } else { // 'info' or default
             feedbackDiv.style.backgroundColor = 'var(--secondary-color, #6c757d)';
             feedbackDiv.style.color = 'white';
         }

         // Animate in
         setTimeout(() => {
            feedbackDiv.style.opacity = '1';
            feedbackDiv.style.bottom = '30px'; // Slide up slightly
         }, 50); // Short delay before fade/slide in

         // Animate out and remove
         setTimeout(() => {
            feedbackDiv.style.opacity = '0';
            feedbackDiv.style.bottom = '20px'; // Slide down slightly
            setTimeout(() => {
                 if (feedbackDiv.parentNode === document.body) { // Check if still attached
                    document.body.removeChild(feedbackDiv);
                 }
            }, 400); // Remove after fade/slide out animation (matches transition duration)
         }, 2500); // Feedback visible duration (2.5 seconds)
     }

     /**
      * Injects CSS for a simple shake animation (used for out-of-stock feedback).
      */
     function addShakeAnimationCSS() {
         const styleId = 'pos-shake-animation-style';
         if (document.getElementById(styleId)) return; // Inject only once

         const styleSheet = document.createElement("style");
         styleSheet.id = styleId;
         styleSheet.type = "text/css";
         styleSheet.innerText = `
             .shake-animation {
                 animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                 transform: translate3d(0, 0, 0);
                 backface-visibility: hidden;
                 perspective: 1000px;
             }
             @keyframes shake {
               10%, 90% { transform: translate3d(-1px, 0, 0); }
               20%, 80% { transform: translate3d(2px, 0, 0); }
               30%, 50%, 70% { transform: translate3d(-3px, 0, 0); } /* Reduced intensity slightly */
               40%, 60% { transform: translate3d(3px, 0, 0); }
             }`;
         document.head.appendChild(styleSheet);
     }


     // --- End of Day / Receipt Function ---

     /**
      * Generates the content for the "End of Day Summary" modal based on `salesHistory`.
      * Calculates totals and profit, then opens the modal.
      */
     function generateDailyReceipt() {
         const receiptContent = document.getElementById('daily-receipt-content');
         if (!receiptContent) {
             console.error("Daily receipt content area not found.");
             return;
         }

         let totalSalesValue = 0;
         let totalCost = 0;
         let salesListHtml = '<ul>';

         if(salesHistory.length === 0) {
             salesListHtml = '<p style="text-align: center; padding: 10px;">No sales recorded for this period.</p>';
         } else {
             // Iterate through sales history to calculate totals and build list
             salesHistory.forEach(sale => {
                 totalSalesValue += sale.total;
                 let saleCost = 0;
                 // Calculate cost for this specific sale
                 sale.items.forEach(item => {
                     // Ensure cost is a number, default to 0 if missing/invalid
                     const itemCost = (typeof item.cost === 'number' && !isNaN(item.cost)) ? item.cost : 0;
                     saleCost += itemCost * item.quantity;
                 });
                 totalCost += saleCost; // Add sale's cost to overall total cost

                 // Create list item HTML for the sale
                 let itemsSummary = sale.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
                 salesListHtml += `<li>
                     <strong>Sale #${sale.id.substring(5, 10)}</strong> - $${sale.total.toFixed(2)}
                     (Est. Cost: $${saleCost.toFixed(2)}) - ${sale.timestamp.toLocaleTimeString()}
                     <br><small style="color:var(--secondary-color); display: block; margin-top: 3px;">Items: ${itemsSummary}</small>
                     </li>`;
             });
             salesListHtml += '</ul>';
         }

        const totalProfit = totalSalesValue - totalCost; // Calculate gross profit

         // Populate the modal content area
         receiptContent.innerHTML = `
            <p>Total Sales Revenue: <strong>$${totalSalesValue.toFixed(2)}</strong></p>
            <p>Total Cost of Goods Sold (Est.): <strong>$${totalCost.toFixed(2)}</strong></p>
            <p>Estimated Gross Profit: <strong style="color: ${totalProfit >= 0 ? 'var(--success-color, green)' : 'var(--danger-color, red)'}; font-size: 1.1em;">$${totalProfit.toFixed(2)}</strong></p>
            <h3 style="margin-top: 15px;">Sales Transactions (${salesHistory.length}):</h3>
            ${salesListHtml}
        `;
         openModal(dailyReceiptModal); // Display the modal
     }


    // --- Tab Switching Logic ---

    /**
     * Switches the visible content tab in the main area.
     * Activates the selected tab link and content panel.
     * Triggers chart generation if the Tracking tab is selected.
     * @param {string} selectedTabId - The ID of the tab content panel to show (e.g., 'pos-view').
     */
    function activateTab(selectedTabId) {
        // Hide all content panels and deactivate all tab links
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        tabLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Find the content panel and link corresponding to the selected ID
        const activeContent = document.getElementById(selectedTabId);
        const activeLink = document.querySelector(`.tab-link[data-tab='${selectedTabId}']`);

        // Activate the selected content panel
        if(activeContent) {
             activeContent.classList.add('active');
             console.log(`Activated tab content: #${selectedTabId}`);
        } else {
            console.error(`Tab content with ID ${selectedTabId} not found.`);
            // Activate the first tab as a fallback?
            // activateTab('pos-view'); // Be careful of infinite loops
            return;
        }
        // Activate the selected tab link
        if(activeLink) {
            activeLink.classList.add('active');
        } else {
             console.error(`Tab link with data-tab ${selectedTabId} not found.`);
        }

        // If the tracking tab was just activated, generate its visuals
        if (selectedTabId === 'tracking-view') {
            generateTrackingVisuals();
        }
    }

    // Add event listeners to all tab links to handle clicks
    tabLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link behavior
            const tabId = link.getAttribute('data-tab');
            if (tabId) {
                activateTab(tabId);
            } else {
                console.error("Tab link clicked, but 'data-tab' attribute is missing:", link);
            }
        });
    });


    // --- Tracking Visual Generation (Chart.js) ---

    /**
     * Helper function to get chart colors based on the current theme (light/dark).
     * Provides consistent color palettes for charts.
     * @returns {object} Object containing color arrays and strings for chart options.
     */
    function getChartColors() {
        const isDarkMode = document.body.getAttribute('data-theme') === 'dark';
        // Define distinct color palettes (using more vibrant options)
        const lightPalette = [
            'rgba(0, 123, 255, 0.75)',  // Primary Blue
            'rgba(40, 167, 69, 0.75)',   // Success Green
            'rgba(255, 193, 7, 0.75)',   // Warning Yellow
            'rgba(23, 162, 184, 0.75)',   // Info Teal
            'rgba(108, 117, 125, 0.75)', // Secondary Gray
            'rgba(253, 126, 20, 0.75)',  // Orange
            'rgba(111, 66, 193, 0.75)'   // Indigo
        ];
        const darkPalette = [
            'rgba(0, 173, 181, 0.8)',  // Primary Teal (Dark)
            'rgba(92, 184, 92, 0.8)',  // Success Green (Dark)
            'rgba(240, 173, 78, 0.8)', // Warning Yellow (Dark)
            'rgba(91, 192, 222, 0.8)',  // Info Blue (Dark)
            'rgba(173, 181, 189, 0.8)',// Secondary Gray (Dark)
            'rgba(255, 136, 0, 0.8)',   // Orange (Dark)
            'rgba(139, 92, 246, 0.8)'   // Indigo (Dark)
        ];

        return {
            // Cycle through palettes for chart segments
            backgroundColor: isDarkMode ? darkPalette : lightPalette,
            // Use semi-transparent white/black for borders for contrast
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            textColor: isDarkMode ? '#EEEEEE' : '#333333',
            gridColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            primaryLineColor: isDarkMode ? 'var(--primary-dark, #00adb5)' : 'var(--primary-light, #007bff)',
             // Ensure fallback colors match theme if CSS variables fail
            lineFillColor: isDarkMode ? 'rgba(0, 173, 181, 0.1)' : 'rgba(0, 123, 255, 0.1)'
        };
    }


    /**
     * Processes `salesHistory` data and generates/updates charts and tables
     * in the Tracking tab using Chart.js.
     */
    function generateTrackingVisuals() {
        console.log("Generating tracking visuals...");

        // Ensure Chart.js is available
        if (typeof Chart === 'undefined') {
            console.error("Chart.js library is not loaded!");
            showTemporaryFeedback("Error: Charting library failed to load.", "error");
            return;
        }
        // Ensure canvas and table elements exist
         if (!salesPieChartCanvas || !salesLineChartCanvas || !topProductsTableBody) {
             console.error("Error: One or more tracking elements (canvas, table body) could not be found in the DOM.");
             return;
         }

        const colors = getChartColors();
        // Set Chart.js default styling based on theme
        Chart.defaults.color = colors.textColor;
        Chart.defaults.borderColor = colors.gridColor;

        // --- 1. Process Sales Data ---
        const productSales = {}; // Aggregated data: { productId: { name, quantity, revenue } }
        const salesOverTime = {}; // Aggregated data: { dateString: totalRevenue }

        if (salesHistory.length === 0) {
            console.log("No sales history to process for tracking visuals.");
            // Optionally display messages in chart areas indicating no data
        }

        salesHistory.forEach(sale => {
            // Process for sales over time (group by day)
            // Use a consistent format for date keys (e.g., YYYY-MM-DD) for reliable sorting
            const saleDate = sale.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD format
            salesOverTime[saleDate] = (salesOverTime[saleDate] || 0) + sale.total;

            // Process for product sales aggregation
            sale.items.forEach(item => {
                if (!productSales[item.id]) {
                    // Get product name reliably from central store if possible
                    const productName = products[item.id] ? products[item.id].name : item.name;
                    productSales[item.id] = { name: productName, quantity: 0, revenue: 0 };
                }
                productSales[item.id].quantity += item.quantity;
                productSales[item.id].revenue += item.price * item.quantity;
            });
        });

        const productData = Object.values(productSales); // Convert aggregated product data to array

        // --- 2. Generate Pie Chart (Sales by Product Revenue) ---
        // Destroy existing chart instance before creating a new one
        if (salesPieChartInstance instanceof Chart) {
             salesPieChartInstance.destroy();
        }
        const pieChartLabels = productData.map(p => p.name);
        const pieChartData = productData.map(p => p.revenue);

        const pieCtx = salesPieChartCanvas.getContext('2d');
        salesPieChartInstance = new Chart(pieCtx, {
            type: 'pie',
            data: {
                // Use labels/data or provide 'No Data' message
                labels: pieChartLabels.length > 0 ? pieChartLabels : ['No Sales Data'],
                datasets: [{
                    label: 'Revenue by Product',
                    data: pieChartData.length > 0 ? pieChartData : [1], // Use dummy data if empty
                    backgroundColor: colors.backgroundColor, // Cycle through palette
                    borderColor: colors.borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // ** Crucial Fix for Resizing **
                plugins: {
                    legend: {
                        position: 'bottom', // Better placement for potentially many items
                         labels: {
                            color: colors.textColor,
                            boxWidth: 12, // Smaller legend color boxes
                            padding: 15 // Spacing for legend items
                         }
                    },
                    title: { display: false }, // Title is handled by H3 in HTML
                     tooltip: {
                         backgroundColor: colors.isDarkMode ? 'rgba(50,50,50,0.8)' : 'rgba(0,0,0,0.8)',
                         titleColor: '#fff',
                         bodyColor: '#fff',
                         callbacks: { // Custom tooltip formatting
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                const value = context.parsed;
                                if (value !== null) {
                                    // Format as currency
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                                }
                                // Calculate percentage
                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 && value !== null ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                label += ` (${percentage})`;
                                return label;
                            }
                        }
                    }
                }
            }
        });


        // --- 3. Generate Line Chart (Sales Trend) ---
         // Destroy existing chart instance
        if (salesLineChartInstance instanceof Chart) {
             salesLineChartInstance.destroy();
        }
         // Sort dates consistently for the line chart
         const sortedDates = Object.keys(salesOverTime).sort(); // Sorts lexicographically (YYYY-MM-DD works)
        const lineChartLabels = sortedDates;
        const lineChartData = sortedDates.map(date => salesOverTime[date]);

        const lineCtx = salesLineChartCanvas.getContext('2d');
        salesLineChartInstance = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: lineChartLabels.length > 0 ? lineChartLabels : ['No Sales Data'],
                datasets: [{
                    label: 'Total Revenue',
                    data: lineChartData.length > 0 ? lineChartData : [0], // Use dummy data if empty
                    fill: true,
                    backgroundColor: colors.lineFillColor, // Use theme-based fill color
                    borderColor: colors.primaryLineColor, // Use theme-based line color
                    borderWidth: 2, // Slightly thicker line
                    tension: 0.2, // Slight curve for aesthetics
                    pointBackgroundColor: colors.primaryLineColor,
                    pointRadius: 4,      // always show the dot
                    pointHoverRadius: 6,
    
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // ** Crucial Fix for Resizing **
                 scales: {
                     y: {
                         beginAtZero: true, // Start Y axis at 0
                          ticks: {
                              color: colors.textColor,
                              // Format Y-axis labels as compact currency
                              callback: function(value) {
                                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);
                              }
                           },
                          grid: { color: colors.gridColor } // Use theme grid color
                     },
                     x: {
                          ticks: {
                              color: colors.textColor,
                              maxRotation: 0, // Prevent label rotation if possible
                              autoSkip: true, // Automatically skip labels if too crowded
                              maxTicksLimit: 10 // Limit number of visible ticks
                          },
                          grid: { display: false } // Hide vertical grid lines for cleaner look
                     }
                 },
                plugins: {
                    legend: { display: false }, // Dataset label is clear enough
                     title: { display: false }, // Title handled by H3
                      tooltip: {
                         backgroundColor: colors.isDarkMode ? 'rgba(50,50,50,0.8)' : 'rgba(0,0,0,0.8)',
                         titleColor: '#fff',
                         bodyColor: '#fff',
                         intersect: false, // Show tooltip when hovering near line, not just on point
                         mode: 'index', // Show tooltips for all datasets at that index
                         callbacks: { // Custom tooltip formatting
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                     label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });


        // --- 4. Generate Top Selling Products Table ---
        if (topProductsTableBody) {
            topProductsTableBody.innerHTML = ''; // Clear previous table data
            // Sort products by quantity sold (descending)
            const sortedProducts = productData.sort((a, b) => b.quantity - a.quantity);

            if (sortedProducts.length === 0) {
                topProductsTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 15px;">No sales data available.</td></tr>';
            } else {
                // Display top 5 or all if fewer than 5
                const topN = sortedProducts.slice(0, 5);
                topN.forEach(product => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${product.name}</td>
                        <td>${product.quantity}</td>
                        <td>$${product.revenue.toFixed(2)}</td>
                    `;
                    topProductsTableBody.appendChild(row);
                });
            }
        } else {
             console.error("Top products table body element not found.");
        }


         // --- 5. Update Key Metrics Display ---
         const totalRevenue = salesHistory.reduce((sum, sale) => sum + sale.total, 0);
         const totalSalesCount = salesHistory.length;
         const averageSaleValue = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

         if(metricTotalSales) metricTotalSales.textContent = totalSalesCount;
         if(metricTotalRevenue) metricTotalRevenue.textContent = totalRevenue.toFixed(2);
         if(metricAvgSale) metricAvgSale.textContent = averageSaleValue.toFixed(2);

         // Update footer snapshot as well
          const footerSalesSnapshot = document.querySelector('.footer .profit-loss-snapshot span:first-child');
          if (footerSalesSnapshot) {
              // Maybe calculate profit here too if needed in footer
              footerSalesSnapshot.textContent = `Tracked Revenue: $${totalRevenue.toFixed(2)}`;
          }

    } // --- End of generateTrackingVisuals ---


    // --- Initial Setup & Event Listeners ---

    // Inject CSS for animations
    addShakeAnimationCSS();

    // Start clock
    updateTime();
    setInterval(updateTime, 30000); // Update time every 30 seconds

    // Wire up core buttons
    themeToggleBtn.addEventListener('click', toggleTheme);
    addProductFab.addEventListener('click', () => openModal(addProductModal));
    closeDayBtn.addEventListener('click', generateDailyReceipt); // "Close Day" button opens the summary modal
    completeSaleBtn.addEventListener('click', handleCompleteSale);
    // ——— CSV Exporter ———
function exportDailyReceiptCSV() {
    if (!salesHistory.length) {
      alert("No sales to export.");
      return;
    }
    // Build header + rows
    const rows = [
      ["Sale ID","Timestamp","Total","Cost","Items"]
    ];
    salesHistory.forEach(sale => {
      const cost = sale.items.reduce((sum,i) => sum + (i.cost||0)*i.quantity, 0);
      const items = sale.items.map(i => `${i.name} (x${i.quantity})`).join("; ");
      rows.push([
        sale.id,
        sale.timestamp.toISOString(),
        sale.total.toFixed(2),
        cost.toFixed(2),
        items
      ]);
    });
    // Convert to CSV string
    const csv = rows.map(r =>
      r.map(field => `"${String(field).replace(/"/g,'""')}"`).join(",")
    ).join("\r\n");
    // Download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `daily_receipt_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // ——— Print Modal ———
  function printDailyReceipt() {
    const content = document.getElementById("daily-receipt-content").innerHTML;
    const w = window.open("", "_blank", "width=600,height=400");
    w.document.write(`
      <html><head><title>Daily Receipt</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          ul { list-style: none; padding:0; }
        </style>
      </head><body>${content}</body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  }
  
  // ——— Attach Listeners ———
  const dailyModal = document.getElementById("daily-receipt-modal");
  dailyModal.querySelectorAll(".modal-actions button").forEach(btn => {
    const t = btn.textContent.trim();
    if (t === "Export CSV") btn.addEventListener("click", exportDailyReceiptCSV);
    if (t === "Print")      btn.addEventListener("click", printDailyReceipt);
  });
  
    // Wire up forms
    addProductForm.addEventListener('submit', handleAddProduct);
    updateStockForm.addEventListener('submit', handleUpdateStock);
    quantityForm.addEventListener('submit', handleQuantitySubmit);


     // Initialize existing sample tiles from HTML and store their data
     productGrid.querySelectorAll('.product-tile').forEach(tile => {
         const productData = {
             id: tile.dataset.id, // Use existing ID from HTML
             name: tile.dataset.name,
             price: parseFloat(tile.dataset.price),
             stock: parseInt(tile.dataset.stock),
             cost: tile.dataset.cost ? parseFloat(tile.dataset.cost) : 0 // Assume cost is 0 if not specified
         };
         // Validate sample data before storing
         if (productData.id && productData.name && !isNaN(productData.price) && !isNaN(productData.stock)) {
             storeProductDetails(productData); // Store initial product details
             updateTileStockStatus(tile, productData.stock); // Set initial visual status
         } else {
             console.warn("Skipping invalid sample product data from HTML:", tile.dataset);
         }

         // Re-attach event listeners specifically for these initial tiles
         // (renderProductTile now handles listeners for dynamically added tiles)

         // Click on tile body
         tile.addEventListener('click', (e) => {
            if (!e.target.closest('.update-stock-btn')) {
                const currentProductData = products[productData.id]; // Get fresh data
                 if (currentProductData && currentProductData.stock > 0) {
                    handleProductTileClick(currentProductData);
                 } else if (currentProductData) {
                     console.log(`Product ${productData.name} is out of stock.`);
                     tile.classList.add('shake-animation');
                     setTimeout(() => tile.classList.remove('shake-animation'), 500);
                 }
            }
         });

         // Click on update stock button within tile
         const stockButton = tile.querySelector('.update-stock-btn');
         if (stockButton) {
             stockButton.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent tile click
                 const currentProductData = products[productData.id]; // Get fresh data
                 if (currentProductData) {
                     openUpdateStockModal(currentProductData);
                 }
             });
         }
     });

      // Adjust layout based on initial screen size and set default state
     function checkLayout() {
        if (window.innerWidth <= 768) { // Mobile view adjustments
             // If the drawer isn't already explicitly opened by user action, keep it closed
             if (!orderDrawer.classList.contains('open')) {
                 orderDrawer.classList.add('closed'); // Use 'closed' state internally for logic if needed
                 orderDrawer.classList.remove('open'); // Ensure 'open' class (for animation) is off
                 toggleDrawerBtnOpen.style.display = 'block'; // Show the external 'View Order' button
             } else {
                  toggleDrawerBtnOpen.style.display = 'none'; // Hide if already open
             }
        } else { // Desktop view adjustments
            orderDrawer.classList.remove('open'); // 'open' class is primarily for mobile animation
            // Desktop visibility is controlled by 'closed' class (added/removed by toggleDrawer)
            toggleDrawerBtnOpen.style.display = 'none'; // Hide the external 'View Order' button
        }
     }
     checkLayout(); // Check layout on initial load
     window.addEventListener('resize', checkLayout); // Re-check layout on window resize

     // Initialize the first tab (Point of Sale) as active
     activateTab('pos-view');
     // Ensure the order summary is correctly displayed initially (should be empty)
     updateOrderSummary();

    console.log('POS UI Initialized.');
// ——— Initialize footer & stock alerts once at startup ———
productGrid.querySelectorAll('.product-tile').forEach(tile => {
    const id    = tile.dataset.id;
    const name  = tile.dataset.name;
    const price = parseFloat(tile.dataset.price);
    const stock = parseInt(tile.dataset.stock, 10);
    const cost  = 0;
    storeProductDetails({ id, name, price, cost, stock });
  });
  updateFooterMetrics();
  updateAlerts();
  
  // ——— Helper to call after any data change ———
  function afterDataChange() {
    updateFooterMetrics();
    updateAlerts();
  }
  
  // ——— Footer‐metric updater ———
  function updateFooterMetrics() {
    const salesEl  = document.getElementById('footer-total-sales');
    const profitEl = document.getElementById('footer-profit');
    let totalRev = 0, totalCost = 0;
    salesHistory.forEach(sale => {
      totalRev += sale.total;
      sale.items.forEach(i => {
        totalCost += (i.cost || 0) * i.quantity;
      });
    });
    if (salesEl)  salesEl.textContent  = totalRev.toFixed(2);
    if (profitEl) profitEl.textContent = (totalRev - totalCost).toFixed(2);
  }
  
  // ——— Stock‐alert updater ———
  function updateAlerts() {
    const alertsEl = document.getElementById('footer-stock-alerts');
    const low = [], out = [];
    Object.values(products).forEach(p => {
      if (p.stock === 0)      out.push(p.name);
      else if (p.stock <= 5)  low.push(p.name);
    });
    let msg = '';
    if (out.length) msg += `Out of stock: ${out.join(', ')}`;
    if (low.length) {
      if (msg) msg += ' | ';
      msg += `Low stock: ${low.join(', ')}`;
    }
    if (!msg) msg = 'None';
    if (alertsEl) alertsEl.textContent = msg;
  }
  
}); // End DOMContentLoaded Event Listener