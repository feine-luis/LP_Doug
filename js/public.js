(function($) {
    'use strict';
    $(function() {
        var $stickyBar = $('.codcheckout-sticky-bar');
        var $checkoutForm = $('.codcheckout-form');
        var $window = $(window);
        var lastScrollTop = 0;
        var delta = 5;
        var didScroll;

        // Handle "Buy Now" button click on archive pages
        $(document).on('click', '.codcheckout-buy-now', function(e) {
            e.preventDefault();
            var $button = $(this);
            var url = $button.attr('href');
            var product_id = $button.data('product_id');
            var quantity = $button.data('quantity') || 1;
        
            // Check if it's an archive page (url contains 'add-to-cart')
            if (url.includes('add-to-cart')) {
                // For archive direct checkout
                $.ajax({
                    url: wc_add_to_cart_params.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'woocommerce_add_to_cart',
                        product_id: product_id,
                        quantity: quantity
                    },
                    success: function(response) {
                        if (response.success) {
                            // Redirect to checkout page instead of cart
                            window.location.href = wc_add_to_cart_params.checkout_url;
                        } else {
                            console.error('Failed to add to cart');
                            // Optionally, show an error message to the user
                        }
                    },
                    error: function() {
                        console.error('AJAX error');
                        // Optionally, show an error message to the user
                    }
                });
            } else {
                // For product page redirect
                window.location.href = url;
            }
        });

        // Debounce function
        function debounce(func, wait) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                clearTimeout(timeout);
                timeout = setTimeout(function() {
                    func.apply(context, args);
                }, wait);
            };
        }
        
        // Check if we should show/hide the sticky bar
        function hasScrolled() {
            var st = $window.scrollTop();
            
            if (Math.abs(lastScrollTop - st) <= delta)
                return;
            
            if ($checkoutForm.length) {
                var formTop = $checkoutForm.offset().top;
                var formBottom = formTop + $checkoutForm.outerHeight();
                
                if (st > lastScrollTop && st > formBottom) {
                    // Scrolling down past the form
                    $stickyBar.addClass('visible');
                } else if(st + $window.height() < formTop) {
                    // Scrolling up before the form
                    $stickyBar.addClass('visible');
                } else {
                    // Within the form area
                    $stickyBar.removeClass('visible');
                }
            }
            
            lastScrollTop = st;
        }
        
        // Throttle scroll events
        $window.scroll(function() {
            didScroll = true;
        });
        
        setInterval(function() {
            if (didScroll) {
                hasScrolled();
                didScroll = false;
            }
        }, 250);

        $('.codcheckout-sticky-button').on('click', function(e) {
            e.preventDefault();
            if ($checkoutForm.length) {
                $('html, body').animate({
                    scrollTop: $checkoutForm.offset().top - 50
                }, 500);
            }
        });

        // Handle form submission
        $('form.codcheckout-form').on('submit', function(e) {
            e.preventDefault();
            var $form = $(this);
            var $submitButton = $form.find('button[type="submit"]');
            var originalButtonText = $submitButton.text();
            var formData = new FormData($form[0]);
            
            // Log all form data
            for (var pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }
            
            formData.append('action', 'codcheckout_process_checkout');
            formData.append('security', codcheckout_data.nonce);
            
            $.ajax({
                url: codcheckout_data.ajax_url,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                beforeSend: function() {
                    $submitButton.text('Processing...').prop('disabled', true);
                    $form.addClass('processing');
                    $form.find('input, select, textarea').prop('disabled', true);
                },
                success: function(response) {
                    if (response.success) {
                        window.location.href = response.data.redirect;
                    } else {
                        showError(response.data.message || 'An error occurred. Please try again.');
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('AJAX error:', textStatus, errorThrown);
                    showError('An error occurred. Please try again.');
                },
                complete: function() {
                    $submitButton.text(originalButtonText).prop('disabled', false);
                    $form.removeClass('processing');
                    $form.find('input, select, textarea').prop('disabled', false);
                }
            });
        });

        // Optional: basic client-side validation feedback
        $checkoutForm.on('change', 'input, select, textarea', function() {
            var $field = $(this);
            var $wrapper = $field.closest('.form-row');
            
            if ($field.val() === '' && $wrapper.hasClass('validate-required')) {
                $wrapper.addClass('woocommerce-invalid');
            } else {
                $wrapper.removeClass('woocommerce-invalid');
            }
        });

        // Function to show error messages
        function showError(message) {
            var $errorDiv = $('.codcheckout-error-message');
            if ($errorDiv.length === 0) {
                $errorDiv = $('<div class="codcheckout-error-message woocommerce-error"></div>');
                $checkoutForm.before($errorDiv);
            }
            $errorDiv.html(message).show();
            $('html, body').animate({
                scrollTop: $errorDiv.offset().top - 100
            }, 500);
        }
    });
})(jQuery);