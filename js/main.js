/* =========================================================
   NITRIXA TECHNOLOGIES
   MAIN JAVASCRIPT

   RESPONSIBILITIES:
   - Mobile navigation
   - Current year
   - Escape key
   - Scroll reveal
   - Reduced motion
   - Active navigation
   - Smooth anchor scrolling
   - Desktop tilt
   - Hero parallax
   - Authentication-aware public header

   AUTHENTICATION FLOW:

   LOGGED OUT
        ↓
   Login / Register

   LOGGED IN
        ↓
   Dashboard

   Dashboard
        ↓
   Logout
        ↓
   Public Website
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        "use strict";


        /* =====================================================
           MOBILE NAVIGATION
        ===================================================== */

        const menuToggle =
            document.querySelector(
                ".menu-toggle"
            );

        const navMenu =
            document.querySelector(
                ".nav-menu"
            );


        if (
            menuToggle &&
            navMenu
        ) {

            menuToggle.addEventListener(
                "click",
                () => {

                    const opened =
                        navMenu.classList.toggle(
                            "open"
                        );


                    menuToggle.setAttribute(
                        "aria-expanded",
                        String(opened)
                    );


                    document.body.classList.toggle(
                        "no-scroll",
                        opened
                    );

                }
            );


            navMenu
                .querySelectorAll("a")
                .forEach(
                    (link) => {

                        link.addEventListener(
                            "click",
                            () => {

                                navMenu.classList.remove(
                                    "open"
                                );


                                menuToggle.setAttribute(
                                    "aria-expanded",
                                    "false"
                                );


                                document.body.classList.remove(
                                    "no-scroll"
                                );

                            }
                        );

                    }
                );

        }


        /* =====================================================
           CURRENT YEAR
        ===================================================== */

        const currentYear =
            document.getElementById(
                "currentYear"
            );


        if (currentYear) {

            currentYear.textContent =
                new Date().getFullYear();

        }


        /* =====================================================
           ESCAPE KEY
        ===================================================== */

        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    if (navMenu) {

                        navMenu.classList.remove(
                            "open"
                        );

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

            }
        );


        /* =====================================================
           SCROLL REVEAL
           Supports:
           .reveal
           .nx-reveal
        ===================================================== */

        const revealElements =
            document.querySelectorAll(
                ".reveal, .nx-reveal"
            );


        if (
            "IntersectionObserver" in window &&
            revealElements.length > 0
        ) {

            const revealObserver =
                new IntersectionObserver(
                    (
                        entries,
                        observer
                    ) => {

                        entries.forEach(
                            (entry) => {

                                if (
                                    !entry.isIntersecting
                                ) {

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


                                observer.unobserve(
                                    element
                                );

                            }
                        );

                    },
                    {
                        threshold: 0.08,
                        rootMargin:
                            "0px 0px -40px 0px"
                    }
                );


            revealElements.forEach(
                (element) => {

                    revealObserver.observe(
                        element
                    );

                }
            );

        } else {

            /*
             * Fallback for browsers where
             * IntersectionObserver is unavailable.
             */

            revealElements.forEach(
                (element) => {

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

                }
            );

        }


        /* =====================================================
           REDUCED MOTION SUPPORT
        ===================================================== */

        const prefersReducedMotion =
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;


        if (
            prefersReducedMotion
        ) {

            revealElements.forEach(
                (element) => {

                    element.classList.add(
                        element.classList.contains(
                            "nx-reveal"
                        )
                            ? "is-visible"
                            : "visible"
                    );

                }
            );

        }


        /* =====================================================
           ACTIVE NAVIGATION
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
                .forEach(
                    (link) => {

                        const href =
                            link.getAttribute(
                                "href"
                            );


                        if (!href) {

                            return;

                        }


                        const linkPage =
                            href
                                .split("/")
                                .pop()
                                .split("#")[0]
                                .toLowerCase();


                        link.classList.remove(
                            "active"
                        );


                        link.removeAttribute(
                            "aria-current"
                        );


                        if (
                            linkPage ===
                                currentPage ||
                            (
                                currentPage ===
                                    "" &&
                                linkPage ===
                                    "index.html"
                            )
                        ) {

                            link.classList.add(
                                "active"
                            );


                            link.setAttribute(
                                "aria-current",
                                "page"
                            );

                        }

                    }
                );

        }


        /* =====================================================
           SMOOTH INTERNAL ANCHOR SCROLLING
        ===================================================== */

        if (
            !prefersReducedMotion
        ) {

            document
                .querySelectorAll(
                    'a[href^="#"]'
                )
                .forEach(
                    (link) => {

                        link.addEventListener(
                            "click",
                            (event) => {

                                const targetId =
                                    link
                                        .getAttribute(
                                            "href"
                                        )
                                        .substring(
                                            1
                                        );


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


                                target.scrollIntoView(
                                    {
                                        behavior:
                                            "smooth",
                                        block:
                                            "start"
                                    }
                                );

                            }
                        );

                    }
                );

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


            tiltElements.forEach(
                (element) => {

                    let frame = null;


                    element.addEventListener(
                        "mousemove",
                        (event) => {

                            if (frame) {

                                cancelAnimationFrame(
                                    frame
                                );

                            }


                            frame =
                                requestAnimationFrame(
                                    () => {

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

                                    }
                                );

                        }
                    );


                    element.addEventListener(
                        "mouseleave",
                        () => {

                            if (frame) {

                                cancelAnimationFrame(
                                    frame
                                );

                            }


                            element.style.transform =
                                "";

                        }
                    );

                }
            );

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
                        requestAnimationFrame(
                            () => {

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

                            }
                        );

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
        ===================================================== */

        requestAnimationFrame(
            () => {

                document
                    .querySelectorAll(
                        ".nx-hero .nx-reveal"
                    )
                    .forEach(
                        (element) => {

                            element.classList.add(
                                "is-visible"
                            );

                        }
                    );

            }
        );


        /* =====================================================
           AUTHENTICATION UI
           PUBLIC WEBSITE HEADER
        ===================================================== */

        async function initializeAuthenticationUI() {

            /*
             * Supabase client may not be available on
             * pages that do not load Supabase.
             *
             * In that case, simply leave the existing
             * public navigation untouched.
             */

            if (
                !window.supabaseClient ||
                !window.supabaseClient.auth
            ) {

                return;

            }


            const supabase =
                window.supabaseClient;


            /*
             * Find common authentication links/buttons.
             *
             * We intentionally support multiple selectors
             * so existing public-page HTML does not need
             * to be rewritten unnecessarily.
             */

            const authElements =
                Array.from(
                    document.querySelectorAll(
                        [
                            "[data-auth-link]",
                            "#headerAuthButton",
                            "#authHeaderButton",
                            ".header-auth-button"
                        ].join(",")
                    )
                );


            /*
             * Remove duplicates.
             */

            const uniqueAuthElements =
                [...new Set(
                    authElements
                )];


            /*
             * If this page does not have a dedicated
             * authentication button, there is nothing
             * to change.
             */

            if (
                uniqueAuthElements.length === 0
            ) {

                return;

            }


            /*
             * Helper:
             * Update a single auth element.
             */

            function updateAuthElement(
                element,
                session
            ) {

                if (!element) {
                    return;
                }


                const loggedIn =
                    Boolean(
                        session &&
                        session.user
                    );


                if (loggedIn) {

                    /*
                     * Logged in:
                     * → Dashboard
                     */

                    element.href =
                        "intern-dashboard.html";


                    element.textContent =
                        "Dashboard";


                    element.setAttribute(
                        "aria-label",
                        "Open Intern Dashboard"
                    );


                    element.dataset.authState =
                        "authenticated";


                    element.classList.add(
                        "is-authenticated"
                    );


                    element.classList.remove(
                        "is-logged-out"
                    );

                } else {

                    /*
                     * Logged out:
                     * → Login / Register
                     */

                    element.href =
                        "login.html";


                    element.textContent =
                        "Login / Register";


                    element.setAttribute(
                        "aria-label",
                        "Login or create an account"
                    );


                    element.dataset.authState =
                        "unauthenticated";


                    element.classList.add(
                        "is-logged-out"
                    );


                    element.classList.remove(
                        "is-authenticated"
                    );

                }

            }


            /*
             * Initial session.
             */

            try {

                const {
                    data,
                    error
                } =
                    await supabase.auth.getSession();


                if (error) {

                    console.error(
                        "NITRIXA: Public auth session check failed:",
                        error
                    );

                    /*
                     * Do not modify the UI on a
                     * session-check error.
                     */

                    return;

                }


                const session =
                    data?.session || null;


                uniqueAuthElements.forEach(
                    (element) => {

                        updateAuthElement(
                            element,
                            session
                        );

                    }
                );


            } catch (error) {

                console.error(
                    "NITRIXA: Authentication UI initialization failed:",
                    error
                );

            }


            /*
             * Listen for login/logout changes.
             *
             * This means the header updates automatically
             * without requiring a manual page refresh.
             */

            supabase.auth.onAuthStateChange(
                (
                    event,
                    session
                ) => {

                    /*
                     * Update the public header for all
                     * authentication changes.
                     */

                    uniqueAuthElements.forEach(
                        (element) => {

                            updateAuthElement(
                                element,
                                session
                            );

                        }
                    );

                }
            );

        }


        /*
         * Initialize authentication UI.
         */

        await initializeAuthenticationUI();


        /* =====================================================
           PAGE READY
        ===================================================== */

        document.documentElement.classList.add(
            "nx-page-ready"
        );

    }
);