// Components JavaScript

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initDialogs();
    initToasts();
    initSnackbars();
    initDatePicker();
    initTimePicker();
    initCustomSelects();
    initTagSelector();
    initSwitches();
    initAccordions();
    initTabs();
    initStarRating();
    initChips();
});

// Dialog Component
function initDialogs() {
    const dialogOverlay = document.getElementById('dialogOverlay');
    const dialogs = document.querySelectorAll('.dialog');
    const dialogOpenButtons = {
        'openBasicDialog': document.getElementById('basicDialog'),
        'openConfirmDialog': document.getElementById('confirmDialog'),
        'openFormDialog': document.getElementById('formDialog')
    };
    
    // Set up dialog open buttons
    for (const [buttonId, dialog] of Object.entries(dialogOpenButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => openDialog(dialog));
        }
    }
    
    // Set up close buttons
    const closeButtons = document.querySelectorAll('.dialog-close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => closeAllDialogs());
    });
    
    // Close when clicking on overlay
    dialogOverlay.addEventListener('click', (e) => {
        if (e.target === dialogOverlay) {
            closeAllDialogs();
        }
    });
    
    // Handle confirm action button
    const confirmActionButton = document.getElementById('confirmAction');
    if (confirmActionButton) {
        confirmActionButton.addEventListener('click', () => {
            // Demo action for confirmation
            showSuccessToast('Action confirmed successfully!');
            closeAllDialogs();
        });
    }
    
    // Handle form submit
    const submitFormButton = document.getElementById('submitForm');
    if (submitFormButton) {
        submitFormButton.addEventListener('click', () => {
            const title = document.getElementById('connectionTitle').value;
            const description = document.getElementById('connectionDescription').value;
            
            if (!title || !description) {
                showErrorToast('Please fill in all fields');
                return;
            }
            
            // Demo action for form submission
            showSuccessToast('Connection created successfully!');
            closeAllDialogs();
            
            // Reset form
            document.getElementById('dialogForm').reset();
        });
    }
    
    // Escape key to close dialogs
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllDialogs();
        }
    });
}

function openDialog(dialog) {
    const dialogOverlay = document.getElementById('dialogOverlay');
    dialogOverlay.classList.add('active');
    
    // First hide all dialogs
    document.querySelectorAll('.dialog').forEach(d => {
        d.classList.remove('active');
    });
    
    // Then show the requested dialog
    dialog.classList.add('active');
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeAllDialogs() {
    const dialogOverlay = document.getElementById('dialogOverlay');
    dialogOverlay.classList.remove('active');
    
    document.querySelectorAll('.dialog').forEach(dialog => {
        dialog.classList.remove('active');
    });
    
    // Re-enable body scroll
    document.body.style.overflow = '';
}

// Toast Notifications
function initToasts() {
    const toastButtons = {
        'showSuccessToast': 'success',
        'showErrorToast': 'error',
        'showInfoToast': 'info',
        'showWarningToast': 'warning'
    };
    
    for (const [buttonId, type] of Object.entries(toastButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                let message = '';
                let icon = '';
                
                switch(type) {
                    case 'success':
                        message = 'Operation completed successfully!';
                        icon = 'check_circle';
                        break;
                    case 'error':
                        message = 'An error occurred. Please try again.';
                        icon = 'error';
                        break;
                    case 'info':
                        message = 'Here is some useful information.';
                        icon = 'info';
                        break;
                    case 'warning':
                        message = 'Careful! This action might have consequences.';
                        icon = 'warning';
                        break;
                }
                
                showToast(message, type, icon);
            });
        }
    }
}

function showToast(message, type = 'info', icon = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.innerHTML = `
        <div class="toast-icon">
            <span class="material-symbols-rounded">${icon}</span>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" aria-label="Close notification">
            <span class="material-symbols-rounded">close</span>
        </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Add active class after a small delay for animation
    setTimeout(() => {
        toast.classList.add('active');
    }, 10);
    
    // Set up close button
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
        closeToast(toast);
    });
    
    // Auto close after 5 seconds
    setTimeout(() => {
        closeToast(toast);
    }, 5000);
    
    return toast;
}

function showSuccessToast(message) {
    return showToast(message, 'success', 'check_circle');
}

function showErrorToast(message) {
    return showToast(message, 'error', 'error');
}

function showInfoToast(message) {
    return showToast(message, 'info', 'info');
}

function showWarningToast(message) {
    return showToast(message, 'warning', 'warning');
}

function closeToast(toast) {
    toast.classList.remove('active');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

// Snackbars
function initSnackbars() {
    const snackbarButtons = {
        'showBasicSnackbar': false,
        'showActionSnackbar': true
    };
    
    for (const [buttonId, hasAction] of Object.entries(snackbarButtons)) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                if (hasAction) {
                    showSnackbar('Item archived', 'Undo', () => {
                        showInfoToast('Action undone');
                    });
                } else {
                    showSnackbar('Message sent successfully');
                }
            });
        }
    }
}

function showSnackbar(message, actionText = null, actionCallback = null) {
    const snackbarContainer = document.querySelector('.snackbar-container');
    
    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.className = 'snackbar';
    
    let actionButton = '';
    if (actionText) {
        actionButton = `<button class="snackbar-action">${actionText}</button>`;
    }
    
    snackbar.innerHTML = `
        <div class="snackbar-message">${message}</div>
        ${actionButton}
    `;
    
    // Add to container
    snackbarContainer.appendChild(snackbar);
    
    // Add active class after a small delay for animation
    setTimeout(() => {
        snackbar.classList.add('active');
    }, 10);
    
    // Set up action button
    if (actionText && actionCallback) {
        const button = snackbar.querySelector('.snackbar-action');
        button.addEventListener('click', () => {
            actionCallback();
            closeSnackbar(snackbar);
        });
    }
    
    // Auto close after 5 seconds
    setTimeout(() => {
        closeSnackbar(snackbar);
    }, 5000);
    
    return snackbar;
}

function closeSnackbar(snackbar) {
    snackbar.classList.remove('active');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
        if (snackbar.parentNode) {
            snackbar.parentNode.removeChild(snackbar);
        }
    }, 300);
}

// Date Picker
function initDatePicker() {
    const datePickerInput = document.getElementById('datePicker');
    const datePickerContainer = document.querySelector('.date-picker-container');
    const datePicker = document.querySelector('.date-picker');
    const daysContainer = document.querySelector('.days');
    const currentMonthElem = document.querySelector('.current-month');
    const prevMonthBtn = document.querySelector('.prev-month');
    const nextMonthBtn = document.querySelector('.next-month');
    const applyBtn = document.querySelector('.date-picker-apply');
    const cancelBtn = document.querySelector('.date-picker-cancel');
    const yearSelector = document.getElementById('yearSelector');
    
    let currentDate = new Date();
    let selectedDate = null;
    
    if (!datePickerInput) return;
    
    // Initialize year selector
    const currentYear = new Date().getFullYear();
    // Add years from current-20 to current+10
    for (let i = currentYear - 20; i <= currentYear + 10; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelector.appendChild(option);
    }
    
    // Set current year
    yearSelector.value = currentYear;
    
    // Year selector change event
    yearSelector.addEventListener('change', () => {
        currentDate.setFullYear(parseInt(yearSelector.value));
        updateDatePicker();
    });
    
    // Open date picker when clicking on input
    datePickerInput.addEventListener('click', () => {
        openDatePicker();
    });
    
    // Close when clicking outside
    datePickerContainer.addEventListener('click', (e) => {
        if (e.target === datePickerContainer) {
            closeDatePicker();
        }
    });
    
    // Apply button
    applyBtn.addEventListener('click', () => {
        if (selectedDate) {
            datePickerInput.value = formatDate(selectedDate);
            closeDatePicker();
            showInfoToast(`Date selected: ${formatDate(selectedDate)}`);
        } else {
            showErrorToast('Please select a date');
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        closeDatePicker();
    });
    
    // Navigation buttons
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        // Update year selector if month change causes year change
        yearSelector.value = currentDate.getFullYear();
        updateDatePicker();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        // Update year selector if month change causes year change
        yearSelector.value = currentDate.getFullYear();
        updateDatePicker();
    });
    
    function openDatePicker() {
        updateDatePicker();
        datePickerContainer.classList.add('active');
        
        // Set current date if no date is selected
        if (!selectedDate) {
            const today = new Date();
            currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
            yearSelector.value = today.getFullYear();
        }
    }
    
    function closeDatePicker() {
        datePickerContainer.classList.remove('active');
    }
    
    function updateDatePicker() {
        // Update month and year display
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        currentMonthElem.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        
        // Clear days container
        daysContainer.innerHTML = '';
        
        // Get first day of month and total days
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
        const totalDays = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        
        // Previous month days
        const prevMonthDays = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            const dayElem = document.createElement('div');
            dayElem.textContent = prevMonthDays - i;
            dayElem.classList.add('inactive');
            daysContainer.appendChild(dayElem);
        }
        
        // Current month days
        const today = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const dayElem = document.createElement('div');
            dayElem.textContent = i;
            
            // Check if this is today
            if (today.getDate() === i && 
                today.getMonth() === currentDate.getMonth() && 
                today.getFullYear() === currentDate.getFullYear()) {
                dayElem.classList.add('today');
            }
            
            // Check if this is the selected date
            if (selectedDate && 
                selectedDate.getDate() === i && 
                selectedDate.getMonth() === currentDate.getMonth() && 
                selectedDate.getFullYear() === currentDate.getFullYear()) {
                dayElem.classList.add('selected');
            }
            
            // Add click handler
            dayElem.addEventListener('click', () => {
                // Remove 'selected' class from all days
                document.querySelectorAll('.days div').forEach(day => {
                    day.classList.remove('selected');
                });
                
                // Add 'selected' class to clicked day
                dayElem.classList.add('selected');
                
                // Update selected date
                selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            });
            
            daysContainer.appendChild(dayElem);
        }
        
        // Next month days
        const totalCells = 42; // 6 rows x 7 days
        const remainingCells = totalCells - (firstDay + totalDays);
        for (let i = 1; i <= remainingCells; i++) {
            const dayElem = document.createElement('div');
            dayElem.textContent = i;
            dayElem.classList.add('inactive');
            daysContainer.appendChild(dayElem);
        }
    }
    
    function formatDate(date) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    }
}

// Time Picker Component
function initTimePicker() {
    const timePickerInput = document.getElementById('timePicker');
    const timePickerContainer = document.querySelector('.time-picker-container');
    const timePicker = document.querySelector('.time-picker');
    const hourWheel = document.querySelector('.hour-wheel .time-wheel-items');
    const minuteWheel = document.querySelector('.minute-wheel .time-wheel-items');
    const periodWheel = document.querySelector('.period-wheel .time-wheel-items');
    const applyBtn = document.querySelector('.time-picker-apply');
    const cancelBtn = document.querySelector('.time-picker-cancel');
    const closeBtn = document.querySelector('.time-picker-close');
    
    let selectedHour = 12;
    let selectedMinute = 0;
    let selectedPeriod = 'PM';
    
    if (!timePickerInput) return;
    
    // Generate hours (1-12)
    if (hourWheel) {
        hourWheel.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            const hourItem = document.createElement('div');
            hourItem.className = 'time-wheel-item';
            hourItem.dataset.value = i;
            hourItem.textContent = i;
            hourWheel.appendChild(hourItem);
        }
    }
    
    // Generate minutes (00-59)
    if (minuteWheel) {
        minuteWheel.innerHTML = '';
        for (let i = 0; i < 60; i++) {
            const minuteItem = document.createElement('div');
            minuteItem.className = 'time-wheel-item';
            minuteItem.dataset.value = i;
            minuteItem.textContent = i.toString().padStart(2, '0');
            minuteWheel.appendChild(minuteItem);
        }
    }
    
    // Initialize period wheel (AM/PM)
    // Already hardcoded in the HTML
    
    // Open time picker when clicking on input
    timePickerInput.addEventListener('click', () => {
        openTimePicker();
    });
    
    // Close when clicking outside
    timePickerContainer.addEventListener('click', (e) => {
        if (e.target === timePickerContainer) {
            closeTimePicker();
        }
    });
    
    // Close button
    closeBtn.addEventListener('click', () => {
        closeTimePicker();
    });
    
    // Apply button
    applyBtn.addEventListener('click', () => {
        const formattedTime = formatTime(selectedHour, selectedMinute, selectedPeriod);
        timePickerInput.value = formattedTime;
        closeTimePicker();
        showInfoToast(`Time selected: ${formattedTime}`);
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', () => {
        closeTimePicker();
    });
    
    // Handle hour selection
    const hourItems = hourWheel.querySelectorAll('.time-wheel-item');
    hourItems.forEach(item => {
        item.addEventListener('click', () => {
            selectedHour = parseInt(item.dataset.value);
            updateActiveItems();
            // Center the selected item
            centerItem(hourWheel, item);
        });
    });
    
    // Handle minute selection
    const minuteItems = minuteWheel.querySelectorAll('.time-wheel-item');
    minuteItems.forEach(item => {
        item.addEventListener('click', () => {
            selectedMinute = parseInt(item.dataset.value);
            updateActiveItems();
            // Center the selected item
            centerItem(minuteWheel, item);
        });
    });
    
    // Handle period selection
    const periodItems = periodWheel.querySelectorAll('.time-wheel-item');
    periodItems.forEach(item => {
        item.addEventListener('click', () => {
            selectedPeriod = item.dataset.value;
            updateActiveItems();
            // Center the selected item
            centerItem(periodWheel, item);
        });
    });
    
    // Add scroll snap effects
    [hourWheel, minuteWheel, periodWheel].forEach(wheel => {
        wheel.addEventListener('scroll', () => {
            // Debounce scroll event
            clearTimeout(wheel.scrollTimeout);
            wheel.scrollTimeout = setTimeout(() => {
                const items = wheel.querySelectorAll('.time-wheel-item');
                let closestItem = null;
                let minDistance = Infinity;
                
                const wheelCenter = wheel.getBoundingClientRect().top + wheel.clientHeight / 2;
                
                items.forEach(item => {
                    const itemRect = item.getBoundingClientRect();
                    const itemCenter = itemRect.top + itemRect.height / 2;
                    const distance = Math.abs(wheelCenter - itemCenter);
                    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestItem = item;
                    }
                });
                
                if (closestItem) {
                    // Update selected time based on the wheel
                    if (wheel === hourWheel) {
                        selectedHour = parseInt(closestItem.dataset.value);
                    } else if (wheel === minuteWheel) {
                        selectedMinute = parseInt(closestItem.dataset.value);
                    } else if (wheel === periodWheel) {
                        selectedPeriod = closestItem.dataset.value;
                    }
                    
                    updateActiveItems();
                    centerItem(wheel, closestItem);
                }
            }, 150);
        });
    });
    
    function openTimePicker() {
        // Parse current input value or use default time
        if (timePickerInput.value) {
            const [time, period] = timePickerInput.value.split(' ');
            const [hour, minute] = time.split(':');
            selectedHour = parseInt(hour);
            selectedMinute = parseInt(minute);
            selectedPeriod = period;
        } else {
            // Default to current time
            const now = new Date();
            selectedHour = now.getHours() % 12 || 12; // Convert 0 to 12
            selectedMinute = now.getMinutes();
            selectedPeriod = now.getHours() >= 12 ? 'PM' : 'AM';
        }
        
        updateActiveItems();
        
        // Initialize wheel positions
        setTimeout(() => {
            // Scroll to selected items
            const selectedHourItem = Array.from(hourItems).find(item => 
                parseInt(item.dataset.value) === selectedHour);
            const selectedMinuteItem = Array.from(minuteItems).find(item => 
                parseInt(item.dataset.value) === selectedMinute);
            const selectedPeriodItem = Array.from(periodItems).find(item => 
                item.dataset.value === selectedPeriod);
            
            if (selectedHourItem) centerItem(hourWheel, selectedHourItem);
            if (selectedMinuteItem) centerItem(minuteWheel, selectedMinuteItem);
            if (selectedPeriodItem) centerItem(periodWheel, selectedPeriodItem);
        }, 0);
        
        timePickerContainer.classList.add('active');
    }
    
    function closeTimePicker() {
        timePickerContainer.classList.remove('active');
    }
    
    function updateActiveItems() {
        // Update active state for all items
        hourItems.forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.value) === selectedHour);
        });
        
        minuteItems.forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.value) === selectedMinute);
        });
        
        periodItems.forEach(item => {
            item.classList.toggle('active', item.dataset.value === selectedPeriod);
        });
    }
    
    function centerItem(container, item) {
        if (!container || !item) return;
        
        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        
        const scrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        const itemTop = itemRect.top - containerRect.top + scrollTop;
        const itemHeight = itemRect.height;
        
        const centeredScrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
        
        container.scrollTo({
            top: centeredScrollTop,
            behavior: 'smooth'
        });
    }
    
    function formatTime(hour, minute, period) {
        return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
    }
}

// Custom Select Component
function initCustomSelects() {
    const customSelect = document.querySelector('.custom-select');
    if (!customSelect) return;
    
    const selectSelected = customSelect.querySelector('.select-selected');
    const selectItems = customSelect.querySelector('.select-items');
    const options = selectItems.querySelectorAll('div');
    
    // Toggle dropdown when clicking on the selected item
    selectSelected.addEventListener('click', () => {
        selectItems.classList.toggle('select-hide');
        selectSelected.classList.toggle('select-arrow-active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target)) {
            selectItems.classList.add('select-hide');
            selectSelected.classList.remove('select-arrow-active');
        }
    });
    
    // Handle option selection
    options.forEach(option => {
        option.addEventListener('click', () => {
            // Update selected display
            selectSelected.textContent = option.textContent;
            selectSelected.dataset.value = option.dataset.value;
            
            // Mark as selected
            options.forEach(opt => {
                opt.classList.remove('same-as-selected');
            });
            option.classList.add('same-as-selected');
            
            // Hide dropdown
            selectItems.classList.add('select-hide');
            selectSelected.classList.remove('select-arrow-active');
            
            // Show toast for demo
            showInfoToast(`Selected: ${option.textContent}`);
        });
    });
}

// Tag Selector Component
function initTagSelector() {
    const tagSelector = document.querySelector('.tag-selector');
    if (!tagSelector) return;
    
    const selectedTags = tagSelector.querySelector('.selected-tags');
    const tagInput = tagSelector.querySelector('.tag-input');
    const tagSuggestions = tagSelector.querySelector('.tag-suggestions');
    const tagOptions = tagSuggestions.querySelectorAll('.tag-option');
    
    // Show suggestions when input is focused
    tagInput.addEventListener('focus', () => {
        tagSuggestions.classList.add('active');
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!tagSelector.contains(e.target)) {
            tagSuggestions.classList.remove('active');
        }
    });
    
    // Handle option selection
    tagOptions.forEach(option => {
        option.addEventListener('click', () => {
            addTag(option.dataset.value, option.textContent);
            tagInput.value = '';
            tagInput.focus();
        });
    });
    
    // Add tag on Enter key
    tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && tagInput.value.trim() !== '') {
            e.preventDefault();
            addTag(tagInput.value.trim().toLowerCase(), tagInput.value.trim());
            tagInput.value = '';
        }
    });
    
    function addTag(value, text) {
        // Check if tag already exists
        if (selectedTags.querySelector(`.tag[data-value="${value}"]`)) {
            showInfoToast('Tag already added');
            return;
        }
        
        // Create tag element
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.dataset.value = value;
        tag.innerHTML = `
            ${text}
            <button class="tag-close" aria-label="Remove tag">×</button>
        `;
        
        // Add to selected tags
        selectedTags.appendChild(tag);
        
        // Set up remove button
        const closeButton = tag.querySelector('.tag-close');
        closeButton.addEventListener('click', () => {
            selectedTags.removeChild(tag);
        });
        
        // Show toast for demo
        showInfoToast(`Tag added: ${text}`);
    }
}

// Switch/Toggle Component
function initSwitches() {
    const basicSwitch = document.getElementById('basicSwitch');
    const switchStatus = document.getElementById('switchStatus');
    
    if (basicSwitch && switchStatus) {
        basicSwitch.addEventListener('change', () => {
            if (basicSwitch.checked) {
                switchStatus.textContent = 'Status: On';
                showInfoToast('Switch turned on');
            } else {
                switchStatus.textContent = 'Status: Off';
                showInfoToast('Switch turned off');
            }
        });
    }
    
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // Set initial state based on body class
        darkModeToggle.checked = document.body.classList.contains('dark-mode');
        
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                showInfoToast('Dark mode enabled');
            } else {
                document.body.classList.remove('dark-mode');
                showInfoToast('Light mode enabled');
            }
        });
    }
}

// Accordion Component
function initAccordions() {
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const accordionId = header.dataset.accordion;
            const content = document.getElementById(`accordion-${accordionId}`);
            const icon = header.querySelector('.accordion-icon');
            
            // Toggle the current accordion
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                icon.classList.remove('active');
            } else {
                content.style.maxHeight = content.scrollHeight + 'px';
                icon.classList.add('active');
            }
        });
    });
}

// Tabs Component
function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabId = link.dataset.tab;
            
            // Hide all tab content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all links
            document.querySelectorAll('.tab-link').forEach(l => {
                l.classList.remove('active');
            });
            
            // Show the selected tab content
            document.getElementById(tabId).classList.add('active');
            
            // Add active class to the clicked link
            link.classList.add('active');
        });
    });
}

// Emoji Rating Component
function initStarRating() {
    // Initialize standard emoji rating
    initEmojiRating('emoji-container', 'emoji-rating-value');
    
    // Initialize themed emoji rating
    initEmojiRating('.themed .emoji-container', 'themed-rating-value');
}

function initEmojiRating(containerSelector, valueElementId) {
    const emojiOptions = document.querySelectorAll(`${containerSelector} .emoji-option[data-rating]`);
    const ratingValueElement = document.getElementById(valueElementId);
    
    if (!emojiOptions.length || !ratingValueElement) return;
    
    const feedbackTexts = {
        1: 'Not good 😞',
        2: 'Could be better 😐',
        3: 'It\'s okay 🙂',
        4: 'Pretty good 😊',
        5: 'Love it! 😍'
    };
    
    // For themed ratings (weather)
    const themedFeedbackTexts = {
        1: 'Terrible experience 🌧️',
        2: 'Room for improvement ⛅',
        3: 'Getting better 🌤️',
        4: 'Great experience! ☀️',
        5: 'Absolutely amazing! 🌈'
    };
    
    emojiOptions.forEach(emoji => {
        emoji.addEventListener('click', () => {
            const rating = parseInt(emoji.dataset.rating);
            const emojiChar = emoji.dataset.emoji;
            
            // Remove active class from all emojis
            emojiOptions.forEach(e => e.classList.remove('active'));
            
            // Mark appropriate emojis as active
            emojiOptions.forEach(e => {
                const emojiRating = parseInt(e.dataset.rating);
                if (emojiRating <= rating) {
                    e.classList.add('active');
                }
            });
            
            // Update rating value text
            const isThemed = containerSelector.includes('themed');
            const feedbackText = isThemed ? themedFeedbackTexts[rating] : feedbackTexts[rating];
            ratingValueElement.textContent = feedbackText;
            
            // Show toast for demo
            showInfoToast(`Rating set to ${rating}/5 ${emojiChar}`);
        });
        
        // Add hover effect
        emoji.addEventListener('mouseenter', () => {
            const rating = parseInt(emoji.dataset.rating);
            const isThemed = containerSelector.includes('themed');
            const feedbackText = isThemed ? themedFeedbackTexts[rating] : feedbackTexts[rating];
            ratingValueElement.textContent = feedbackText;
        });
        
        // Reset text when not hovering
        emoji.addEventListener('mouseleave', () => {
            // Only reset if no rating is selected
            if (!document.querySelector(`${containerSelector} .emoji-option.active`)) {
                ratingValueElement.textContent = isThemed ? 'How was your experience?' : 'Select how you feel';
            } else {
                // Show the currently selected rating
                const activeEmoji = document.querySelector(`${containerSelector} .emoji-option.active:last-child`);
                if (activeEmoji) {
                    const rating = parseInt(activeEmoji.dataset.rating);
                    const isThemed = containerSelector.includes('themed');
                    const feedbackText = isThemed ? themedFeedbackTexts[rating] : feedbackTexts[rating];
                    ratingValueElement.textContent = feedbackText;
                }
            }
        });
    });
}

// Chips/Pills Component
function initChips() {
    const chipCloseButtons = document.querySelectorAll('.chip .chip-close');
    
    chipCloseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const chip = button.closest('.chip');
            chip.remove();
            showInfoToast('Chip removed');
        });
    });
} 