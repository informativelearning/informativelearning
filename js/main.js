(function ($) {
    "use strict";
    
    // Dropdown on mouse hover
    $(document).ready(function () {
        function toggleNavbarMethod() {
            if ($(window).width() > 992) {
                $('.navbar .dropdown').on('mouseover', function () {
                    $('.dropdown-toggle', this).trigger('click');
                }).on('mouseout', function () {
                    $('.dropdown-toggle', this).trigger('click').blur();
                });
            } else {
                $('.navbar .dropdown').off('mouseover').off('mouseout');
            }
        }
        toggleNavbarMethod();
        $(window).resize(toggleNavbarMethod);
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    // Courses carousel
    $(".courses-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        loop: true,
        dots: false,
        nav : false,
        responsive: {
            0:{
                items:1
            },
            576:{
                items:2
            },
            768:{
                items:3
            },
            992:{
                items:4
            }
        }
    });


    // Team carousel
    $(".team-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        margin: 30,
        dots: false,
        loop: true,
        nav : true,
        navText : [
            '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            '<i class="fa fa-angle-right" aria-hidden="true"></i>'
        ],
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1500,
        items: 1,
        dots: false,
        loop: true,
        nav : true,
        navText : [
            '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            '<i class="fa fa-angle-right" aria-hidden="true"></i>'
        ],
    });


    // Related carousel
    $(".related-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        margin: 30,
        dots: false,
        loop: true,
        nav : true,
        navText : [
            '<i class="fa fa-angle-left" aria-hidden="true"></i>',
            '<i class="fa fa-angle-right" aria-hidden="true"></i>'
        ],
        responsive: {
            0:{
                items:1
            },
            576:{
                items:1
            },
            768:{
                items:2
            }
        }
    });
    
})(jQuery);

// Track user interactions for the secret code
let keySequence = "";
let logoClickCount = 0;
let secretActivated = false;

// Listen for keyboard input to detect the secret phrase
document.addEventListener('keydown', function(event) {
    // Add the pressed key to the sequence
    keySequence += event.key.toLowerCase();
    
    // Check if the sequence contains our secret phrase
    if (keySequence.includes("cogito ergo sum")) {
        // Reset the key sequence to prevent multiple triggers
        keySequence = "";
        // Set the first condition as met
        secretActivated = true;
        console.log("Secret phrase detected! Now click the logo 3 times.");
    }
    
    // Limit the length of the key sequence to prevent memory issues
    if (keySequence.length > 100) {
        keySequence = keySequence.substr(keySequence.length - 50);
    }
});

// Add event listener to the logo
document.addEventListener('DOMContentLoaded', function() {
    const logo = document.querySelector('.navbar-brand');
    
    if (logo) {
        logo.addEventListener('click', function(event) {
            // Only count clicks if the secret phrase has been entered
            if (secretActivated) {
                logoClickCount++;
                console.log(`Logo clicked ${logoClickCount} times`);
                
                // Check if we've reached 3 clicks
                if (logoClickCount === 3) {
                    // Redirect to the secret page
                    window.location.href = 'secret-page.html';
                    
                    // Reset counters
                    secretActivated = false;
                    logoClickCount = 0;
                    
                    // Prevent the default anchor behavior
                    event.preventDefault();
                }
            }
        });
    }
});