document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    const editor = document.getElementById('editor');
    const wordCount = document.querySelector('.word-count');
    const titleInput = document.getElementById('post-title');
    const characterCount = document.querySelector('.character-count');
    const newTopicBtn = document.querySelector('.new-topic-btn');
    const newTopicModal = document.querySelector('.new-topic-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const cancelTopicBtn = document.querySelector('.cancel-topic');
    const createTopicBtn = document.querySelector('.create-topic');
    const iconOptions = document.querySelectorAll('.icon-option');
    const coverImageContainer = document.getElementById('cover-image-container');
    const coverImageInput = document.getElementById('cover-image');
    const previewImage = document.getElementById('preview-image');
    const imagePreview = document.querySelector('.image-preview');
    const uploadPlaceholder = document.querySelector('.upload-placeholder');
    const removeImageBtn = document.querySelector('.remove-image');
    const toolbarButtons = document.querySelectorAll('.toolbar-btn');

    // Character counter for title
    titleInput.addEventListener('input', function() {
        const currentLength = titleInput.value.length;
        characterCount.textContent = `${currentLength}/100`;
        
        // Visual feedback when approaching limit
        if (currentLength > 80) {
            characterCount.style.color = '#CD7213'; // Warning color
        } else {
            characterCount.style.color = ''; // Reset to default
        }
    });

    // Word counter for content
    editor.addEventListener('input', updateWordCount);

    function updateWordCount() {
        const text = editor.innerText || '';
        const words = text.trim().split(/\s+/).filter(Boolean);
        wordCount.textContent = `${words.length} words`;
    }

    // New Topic Modal
    newTopicBtn.addEventListener('click', function() {
        newTopicModal.classList.add('active');
    });

    function closeModal() {
        newTopicModal.classList.remove('active');
        // Reset form
        document.getElementById('topic-name').value = '';
        document.getElementById('topic-description').value = '';
        iconOptions.forEach(option => option.classList.remove('selected'));
    }

    closeModalBtn.addEventListener('click', closeModal);
    cancelTopicBtn.addEventListener('click', closeModal);

    // Click outside to close
    newTopicModal.addEventListener('click', function(event) {
        if (event.target === newTopicModal) {
            closeModal();
        }
    });

    // Icon Selection
    iconOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selection from all options
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selection to clicked option
            option.classList.add('selected');
        });
    });

    // Create new topic
    createTopicBtn.addEventListener('click', function() {
        const topicName = document.getElementById('topic-name').value.trim();
        const topicDescription = document.getElementById('topic-description').value.trim();
        const selectedIcon = document.querySelector('.icon-option.selected');
        
        if (!topicName) {
            alert('Please enter a topic name');
            return;
        }
        
        if (!selectedIcon) {
            alert('Please select an icon');
            return;
        }
        
        // Here you would typically send this data to your backend
        // For now, we'll just add it to the dropdown
        const iconName = selectedIcon.getAttribute('data-icon');
        
        const topicSelect = document.getElementById('post-topic');
        const newOption = document.createElement('option');
        newOption.value = topicName.toLowerCase().replace(/\s+/g, '-');
        newOption.text = topicName;
        newOption.selected = true;
        topicSelect.appendChild(newOption);
        
        closeModal();
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.textContent = `Topic "${topicName}" created successfully!`;
        document.querySelector('.topic-group').appendChild(successMessage);
        
        setTimeout(() => {
            successMessage.remove();
        }, 3000);
    });

    // Cover Image Upload
    coverImageContainer.addEventListener('click', function() {
        coverImageInput.click();
    });

    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        coverImageContainer.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    coverImageContainer.addEventListener('dragenter', function() {
        coverImageContainer.classList.add('highlight');
    });

    coverImageContainer.addEventListener('dragleave', function() {
        coverImageContainer.classList.remove('highlight');
    });

    coverImageContainer.addEventListener('drop', function(e) {
        coverImageContainer.classList.remove('highlight');
        const files = e.dataTransfer.files;
        if (files.length) {
            handleFiles(files);
        }
    });

    coverImageInput.addEventListener('change', function() {
        if (this.files.length) {
            handleFiles(this.files);
        }
    });

    function handleFiles(files) {
        if (files[0].type.startsWith('image/')) {
            const file = files[0];
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                uploadPlaceholder.style.display = 'none';
                imagePreview.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            alert('Please upload an image file');
        }
    }

    // Remove uploaded image
    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent triggering container click
        previewImage.src = '';
        coverImageInput.value = '';
        uploadPlaceholder.style.display = 'flex';
        imagePreview.style.display = 'none';
    });

    // Formatting tools
    toolbarButtons.forEach(button => {
        button.addEventListener('click', function() {
            const format = button.getAttribute('data-format');
            applyFormat(format);
        });
    });

    function applyFormat(format) {
        editor.focus();
        
        switch(format) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'link':
                const url = prompt('Enter the URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'h2':
                document.execCommand('formatBlock', false, '<h2>');
                break;
            case 'quote':
                document.execCommand('formatBlock', false, '<blockquote>');
                break;
            case 'list':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'image':
                const imgUrl = prompt('Enter the image URL:');
                if (imgUrl) {
                    document.execCommand('insertImage', false, imgUrl);
                }
                break;
        }
        
        updateWordCount();
    }

    // Handle form submission
    const publishBtn = document.querySelector('.publish-btn');
    const previewBtn = document.querySelector('.preview-btn');
    const saveDraftBtn = document.querySelector('.save-draft-btn');

    publishBtn.addEventListener('click', function() {
        if (validateForm()) {
            // Here you would typically send the data to your backend
            // For this demo, let's just show a success message
            alert('Your post has been published successfully!');
            // In a real app, you might redirect to the published post:
            // window.location.href = 'read.html';
        }
    });

    previewBtn.addEventListener('click', function() {
        if (validateForm()) {
            // In a real app, you might store the draft data and open a preview page
            alert('Preview feature would show your post as it will appear when published.');
        }
    });

    saveDraftBtn.addEventListener('click', function() {
        // Less strict validation for drafts
        if (titleInput.value.trim()) {
            // Here you would typically save the draft data
            alert('Your draft has been saved.');
        } else {
            alert('Please enter a title for your draft.');
        }
    });

    function validateForm() {
        const title = titleInput.value.trim();
        const topic = document.getElementById('post-topic').value;
        const content = editor.innerHTML.trim();
        
        if (!title) {
            alert('Please enter a title for your post.');
            titleInput.focus();
            return false;
        }
        
        if (!topic) {
            alert('Please select a topic for your post.');
            return false;
        }
        
        if (!content || editor.innerText.trim() === '') {
            alert('Please add some content to your post.');
            editor.focus();
            return false;
        }
        
        return true;
    }
}); 