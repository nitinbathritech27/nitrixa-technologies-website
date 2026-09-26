/* =========================================================
   NITRIXA TECHNOLOGIES
   MAIN JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       MOBILE NAVIGATION
    ===================================================== */

    const menuToggle = document.querySelector(".menu-toggle");
    const navMenu = document.querySelector(".nav-menu");

    if (menuToggle && navMenu) {

        menuToggle.addEventListener("click", () => {

            const opened = navMenu.classList.toggle("open");

            menuToggle.setAttribute(
                "aria-expanded",
                String(opened)
            );

            document.body.classList.toggle(
                "no-scroll",
                opened
            );

        });


        navMenu.querySelectorAll("a").forEach((link) => {

            link.addEventListener("click", () => {

                navMenu.classList.remove("open");

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                document.body.classList.remove(
                    "no-scroll"
                );

            });

        });

    }


    /* =====================================================
       CURRENT YEAR
    ===================================================== */

    const currentYear =
        document.getElementById("currentYear");

    if (currentYear) {

        currentYear.textContent =
            new Date().getFullYear();

    }


    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            if (navMenu) {
                navMenu.classList.remove("open");
            }

            if (menuToggle) {

                menuToggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

            document.body.classList.remove(
                "no-scroll"
            );

        }

    });


    /* =====================================================
       SCROLL REVEAL
       Supports both:
       .reveal
       .nx-reveal
    ===================================================== */

    const revealElements = document.querySelectorAll(
        ".reveal, .nx-reveal"
    );


    if (
        "IntersectionObserver" in window &&
        revealElements.length > 0
    ) {

        const revealObserver =
            new IntersectionObserver(
                (entries, observer) => {

                    entries.forEach((entry) => {

                        if (!entry.isIntersecting) {
                            return;
                        }


                        const element =
                            entry.target;


                        if (
                            element.classList.contains(
                                "nx-reveal"
                            )
                        ) {

                            element.classList.add(
                                "is-visible"
                            );

                        } else {

                            element.classList.add(
                                "visible"
                            );

                        }


                        observer.unobserve(element);

                    });

                },
                {
                    threshold: 0.08,
                    rootMargin: "0px 0px -40px 0px"
                }
            );


        revealElements.forEach((element) => {

            revealObserver.observe(element);

        });

    } else {

        /*
         * Fallback for browsers where
         * IntersectionObserver is unavailable.
         */

        revealElements.forEach((element) => {

            if (
                element.classList.contains(
                    "nx-reveal"
                )
            ) {

                element.classList.add(
                    "is-visible"
                );

            } else {

                element.classList.add(
                    "visible"
                );

            }

        });

    }


    /* =====================================================
       REDUCED MOTION SUPPORT
    ===================================================== */

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;


    if (prefersReducedMotion) {

        revealElements.forEach((element) => {

            element.classList.add(
                element.classList.contains("nx-reveal")
                    ? "is-visible"
                    : "visible"
            );

        });

    }


    /* =====================================================
       ACTIVE NAVIGATION
       Automatically detects current page.
    ===================================================== */

    const currentPage =
        window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();


    if (navMenu) {

        navMenu
            .querySelectorAll(
                "a.nav-link"
            )
            .forEach((link) => {

                const href =
                    link.getAttribute("href");


                if (!href) {
                    return;
                }


                const linkPage =
                    href
                        .split("/")
                        .pop()
                        .split("#")[0]
                        .toLowerCase();


                link.classList.remove("active");

                link.removeAttribute(
                    "aria-current"
                );


                if (
                    linkPage === currentPage ||
                    (
                        currentPage === "" &&
                        linkPage === "index.html"
                    )
                ) {

                    link.classList.add("active");

                    link.setAttribute(
                        "aria-current",
                        "page"
                    );

                }

            });

    }


    /* =====================================================
       SMOOTH INTERNAL ANCHOR SCROLLING
    ===================================================== */

    if (!prefersReducedMotion) {

        document
            .querySelectorAll(
                'a[href^="#"]'
            )
            .forEach((link) => {

                link.addEventListener(
                    "click",
                    (event) => {

                        const targetId =
                            link
                                .getAttribute("href")
                                .substring(1);


                        if (!targetId) {
                            return;
                        }


                        const target =
                            document.getElementById(
                                targetId
                            );


                        if (!target) {
                            return;
                        }


                        event.preventDefault();


                        target.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    }
                );

            });

    }


    /* =====================================================
       DESKTOP TILT EFFECT
       Only elements with .nx-tilt
    ===================================================== */

    if (
        window.matchMedia(
            "(pointer: fine)"
        ).matches &&
        !prefersReducedMotion
    ) {

        const tiltElements =
            document.querySelectorAll(
                ".nx-tilt"
            );


        tiltElements.forEach((element) => {

            let frame = null;


            element.addEventListener(
                "mousemove",
                (event) => {

                    if (frame) {
                        cancelAnimationFrame(frame);
                    }


                    frame =
                        requestAnimationFrame(() => {

                            const rect =
                                element.getBoundingClientRect();


                            const x =
                                event.clientX -
                                rect.left;


                            const y =
                                event.clientY -
                                rect.top;


                            const rotateY =
                                (
                                    x /
                                    rect.width -
                                    0.5
                                ) * 6;


                            const rotateX =
                                (
                                    0.5 -
                                    y /
                                    rect.height
                                ) * 6;


                            element.style.transform =
                                `perspective(900px)
                                 rotateX(${rotateX}deg)
                                 rotateY(${rotateY}deg)
                                 translateY(-2px)`;

                        });

                }
            );


            element.addEventListener(
                "mouseleave",
                () => {

                    if (frame) {
                        cancelAnimationFrame(frame);
                    }


                    element.style.transform =
                        "";

                }
            );

        });

    }


    /* =====================================================
       HOME HERO PARALLAX
    ===================================================== */

    const heroVisual =
        document.querySelector(
            ".nx-hero-visual"
        );


    if (
        heroVisual &&
        !prefersReducedMotion &&
        window.matchMedia(
            "(pointer: fine)"
        ).matches
    ) {

        let heroFrame = null;


        window.addEventListener(
            "mousemove",
            (event) => {

                if (heroFrame) {
                    cancelAnimationFrame(
                        heroFrame
                    );
                }


                heroFrame =
                    requestAnimationFrame(() => {

                        const x =
                            (
                                event.clientX /
                                window.innerWidth
                            ) - 0.5;


                        const y =
                            (
                                event.clientY /
                                window.innerHeight
                            ) - 0.5;


                        heroVisual.style.transform =
                            `translate3d(
                                ${x * 8}px,
                                ${y * 6}px,
                                0
                            )`;

                    });

            }
        );


        window.addEventListener(
            "mouseleave",
            () => {

                if (heroFrame) {
                    cancelAnimationFrame(
                        heroFrame
                    );
                }


                heroVisual.style.transform =
                    "";

            }
        );

    }


    /* =====================================================
       HERO REVEAL SAFETY
       Prevents Home hero from remaining invisible
       if observer does not trigger immediately.
    ===================================================== */

    requestAnimationFrame(() => {

        document
            .querySelectorAll(
                ".nx-hero .nx-reveal"
            )
            .forEach((element) => {

                element.classList.add(
                    "is-visible"
                );

            });

    });


    /* =====================================================
       PAGE READY
    ===================================================== */

    document.documentElement.classList.add(
        "nx-page-ready"
    );

});