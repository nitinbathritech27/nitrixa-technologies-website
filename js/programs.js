/* =========================================================
   NITRIXA TECHNOLOGIES
   PUBLIC PROGRAMS
   SUPABASE ACTIVE PROGRAMS
   AUTH-AWARE PROGRAM ACTIONS
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       START
       ===================================================== */

    function startPrograms() {

        console.log(
            "NITRIXA: Public Programs module starting..."
        );


        const programGrid =
            document.getElementById(
                "publicProgramGrid"
            );


        if (!programGrid) {

            console.error(
                "NITRIXA: #publicProgramGrid was not found."
            );

            return;
        }


        console.log(
            "NITRIXA: #publicProgramGrid found."
        );


        /*
         * Supabase client should already be created
         * by js/supabase.js.
         */

        if (
            !window.supabaseClient
        ) {

            console.error(
                "NITRIXA: Supabase client is NOT available."
            );

            showMessage(
                programGrid,
                "Programs could not be loaded because the Supabase connection is unavailable.",
                true
            );

            return;
        }


        console.log(
            "NITRIXA: Supabase client is available."
        );


        loadPrograms(
            programGrid
        );
    }



    /* =====================================================
       LOAD PROGRAMS
       ===================================================== */

    async function loadPrograms(
        programGrid
    ) {

        showLoading(
            programGrid
        );


        console.log(
            "NITRIXA: Requesting ACTIVE programs from Supabase..."
        );


        try {

            /*
             * Only fields required by the public program
             * cards are requested.
             *
             * Only ACTIVE programs are displayed publicly.
             */

            const result =
                await window.supabaseClient
                    .from("programs")
                    .select(
                        [
                            "id",
                            "name",
                            "slug",
                            "category",
                            "description",
                            "level",
                            "program_type",
                            "duration",
                            "fee",
                            "technologies",
                            "status",
                            "training_duration",
                            "internship_duration",
                            "payment_model"
                        ].join(",")
                    )
                    .eq(
                        "status",
                        "ACTIVE"
                    )
                    .order(
                        "created_at",
                        {
                            ascending: true
                        }
                    );


            const data =
                result.data;

            const error =
                result.error;


            /* =================================================
               DEBUG INFORMATION
            ================================================= */

            console.log(
                "NITRIXA: Supabase program response:",
                result
            );


            if (error) {

                console.error(
                    "NITRIXA: Supabase program query FAILED."
                );

                console.error(
                    "NITRIXA: Error message:",
                    error.message
                );

                console.error(
                    "NITRIXA: Error details:",
                    error.details
                );

                console.error(
                    "NITRIXA: Error hint:",
                    error.hint
                );

                console.error(
                    "NITRIXA: Error code:",
                    error.code
                );


                showMessage(
                    programGrid,
                    "Programs could not be loaded. Please try again.",
                    true
                );


                return;
            }


            const programs =
                Array.isArray(data)
                    ? data
                    : [];


            console.log(
                "NITRIXA: ACTIVE programs received:",
                programs.length
            );


            console.table(
                programs
            );


            /* =================================================
               NO PROGRAMS
            ================================================= */

            if (
                programs.length === 0
            ) {

                console.warn(
                    "NITRIXA: No ACTIVE programs were returned."
                );


                showEmpty(
                    programGrid
                );


                return;
            }


            /* =================================================
               RENDER
            ================================================= */

            renderPrograms(
                programGrid,
                programs
            );


            /*
             * The cards are now in the DOM.
             *
             * Update Explore / Apply buttons according
             * to the current authentication state.
             */

            await initializeProgramActionLinks();


            console.log(
                "NITRIXA: Public programs rendered successfully."
            );

        } catch (error) {

            console.error(
                "NITRIXA: Unexpected error while loading programs:",
                error
            );


            showMessage(
                programGrid,
                "Programs could not be loaded right now.",
                true
            );
        }
    }



    /* =====================================================
       AUTH-AWARE PROGRAM ACTION LINKS
       ===================================================== */

    async function initializeProgramActionLinks() {

        if (
            !window.supabaseClient
        ) {

            console.error(
                "NITRIXA: Cannot initialize program action links because Supabase is unavailable."
            );

            return;
        }


        try {

            const {
                data,
                error
            } =
                await window.supabaseClient.auth.getSession();


            if (error) {

                console.error(
                    "NITRIXA: Could not read authentication session:",
                    error
                );

                updateProgramActionLinks(
                    false
                );

                return;
            }


            const session =
                data?.session || null;


            updateProgramActionLinks(
                Boolean(
                    session
                )
            );


            console.log(
                "NITRIXA: Program action links initialized.",
                session
                    ? "Authenticated user"
                    : "Logged-out user"
            );


        } catch (error) {

            console.error(
                "NITRIXA: Unexpected authentication error:",
                error
            );


            /*
             * Safe fallback:
             *
             * If authentication state cannot be confirmed,
             * keep the user on Login / Register.
             */

            updateProgramActionLinks(
                false
            );
        }
    }



    /* =====================================================
       UPDATE PROGRAM ACTION LINKS
       ===================================================== */

    function updateProgramActionLinks(
        isAuthenticated
    ) {

        const actionLinks =
            document.querySelectorAll(
                '[data-program-action="auth"]'
            );


        if (
            !actionLinks.length
        ) {

            return;
        }


        actionLinks.forEach(
            function (link) {

                const slug =
                    link.getAttribute(
                        "data-program-slug"
                    );


                if (
                    isAuthenticated &&
                    slug
                ) {

                    /*
                     * Logged-in user:
                     *
                     * Programs
                     *    ↓
                     * Explore / Apply
                     *    ↓
                     * Enrollment page
                     */

                    link.href =
                        "enroll.html?program=" +
                        encodeURIComponent(
                            slug
                        );


                    link.setAttribute(
                        "aria-label",
                        "Continue enrollment for " +
                        getProgramNameFromLink(
                            link
                        )
                    );


                    link.setAttribute(
                        "data-program-action",
                        "enroll"
                    );


                } else {

                    /*
                     * Logged-out user:
                     *
                     * Programs
                     *    ↓
                     * Explore / Apply
                     *    ↓
                     * Login / Register
                     */

                    link.href =
                        "login.html";


                    link.setAttribute(
                        "aria-label",
                        "Login or register to explore this program"
                    );


                    link.setAttribute(
                        "data-program-action",
                        "auth"
                    );
                }
            }
        );
    }



    /* =====================================================
       PROGRAM NAME FROM CARD
       ===================================================== */

    function getProgramNameFromLink(
        link
    ) {

        const card =
            link.closest(
                ".program-card"
            );


        if (!card) {

            return "this program";
        }


        const heading =
            card.querySelector(
                "h3"
            );


        if (
            !heading ||
            !heading.textContent
        ) {

            return "this program";
        }


        return heading.textContent.trim();
    }



    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */

    function initializeProgramAuthListener() {

        if (
            !window.supabaseClient
        ) {

            return;
        }


        try {

            window.supabaseClient.auth.onAuthStateChange(
                function (
                    event,
                    session
                ) {

                    console.log(
                        "NITRIXA: Program page auth state changed:",
                        event
                    );


                    const isAuthenticated =
                        Boolean(
                            session
                        );


                    updateProgramActionLinks(
                        isAuthenticated
                    );
                }
            );

        } catch (error) {

            console.error(
                "NITRIXA: Could not initialize program auth listener:",
                error
            );
        }
    }



    /* =====================================================
       RENDER PROGRAMS
       ===================================================== */

    function renderPrograms(
        programGrid,
        programs
    ) {

        programGrid.innerHTML = "";


        programs.forEach(
            (
                program,
                index
            ) => {

                const card =
                    createProgramCard(
                        program,
                        index
                    );


                programGrid.insertAdjacentHTML(
                    "beforeend",
                    card
                );
            }
        );
    }



    /* =====================================================
       CREATE PROGRAM CARD
       ===================================================== */

    function createProgramCard(
        program,
        index
    ) {

        const technologies =
            normalizeTechnologies(
                program.technologies
            );


        const technologyHtml =
            technologies.length > 0
                ? technologies
                    .slice(
                        0,
                        8
                    )
                    .map(
                        function (technology) {

                            return `
                                <span>
                                    ${escapeHtml(
                                        technology
                                    )}
                                </span>
                            `;
                        }
                    )
                    .join("")
                : `
                    <span>
                        Practical Technology
                    </span>
                `;


        const type =
            formatProgramType(
                program.program_type
            );


        const level =
            formatLevel(
                program.level
            );


        const duration =
            getDuration(
                program
            );


        const payment =
            getPaymentText(
                program
            );


        const structure =
            getStructure(
                program
            );


        const description =
            program.description ||
            "A structured NITRIXA Technologies program focused on practical technology development.";


        const fee =
            Number(
                program.fee || 0
            );


        return `

            <article
                class="program-card program-card-featured"
                data-program-id="${escapeHtml(
                    program.id || ""
                )}"
            >

                <div class="program-card-top">

                    <span class="program-badge">

                        ${escapeHtml(
                            program.category ||
                            "Technology"
                        )}

                    </span>


                    <span class="program-index">

                        ${String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        )}

                    </span>

                </div>


                <h3>

                    ${escapeHtml(
                        program.name ||
                        "Program"
                    )}

                </h3>


                <p class="program-summary">

                    ${escapeHtml(
                        description
                    )}

                </p>


                <div class="program-meta">

                    <div>

                        <span>
                            Type
                        </span>

                        <strong>

                            ${escapeHtml(
                                type
                            )}

                        </strong>

                    </div>


                    <div>

                        <span>
                            Level
                        </span>

                        <strong>

                            ${escapeHtml(
                                level
                            )}

                        </strong>

                    </div>


                    <div>

                        <span>
                            Duration
                        </span>

                        <strong>

                            ${duration}

                        </strong>

                    </div>

                </div>


                <div class="program-section">

                    <h4>
                        Program Fee
                    </h4>


                    <p>

                        <strong
                            class="public-program-fee"
                        >

                            ₹${fee.toLocaleString(
                                "en-IN"
                            )}

                        </strong>

                    </p>


                    <p class="program-payment-note">

                        ${escapeHtml(
                            payment
                        )}

                    </p>

                </div>


                <div class="program-section">

                    <h4>
                        Technology
                    </h4>


                    <div class="program-tags">

                        ${technologyHtml}

                    </div>

                </div>


                <div class="program-section">

                    <h4>
                        Program Structure
                    </h4>


                    <ul>

                        ${structure}

                    </ul>

                </div>


                <!--
                    IMPORTANT FLOW

                    LOGGED OUT

                    Public Programs
                        ↓
                    Explore / Apply
                        ↓
                    Login / Register
                        ↓
                    Intern Dashboard
                        ↓
                    Program Enrollment
                        ↓
                    Payment


                    LOGGED IN

                    Public Programs
                        ↓
                    Explore / Apply
                        ↓
                    Program Enrollment
                        ↓
                    Payment
                -->

                <a
                    href="login.html"
                    class="program-cta"
                    data-program-action="auth"
                    data-program-slug="${escapeHtml(
                        program.slug || ""
                    )}"
                    aria-label="Login or register to explore this program"
                >

                    Explore / Apply

                    <span aria-hidden="true">
                        →
                    </span>

                </a>


            </article>

        `;
    }



    /* =====================================================
       DURATION
       ===================================================== */

    function getDuration(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            const training =
                program.training_duration ||
                "—";


            const internship =
                program.internship_duration ||
                "—";


            return `
                ${escapeHtml(
                    training
                )}
                Training +
                ${escapeHtml(
                    internship
                )}
                Internship
            `;
        }


        return escapeHtml(
            program.internship_duration ||
            program.duration ||
            "—"
        );
    }



    /* =====================================================
       PAYMENT
       ===================================================== */

    function getPaymentText(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return (
                "Full payment during enrollment. No separate internship payment."
            );
        }


        if (
            program.payment_model ===
            "FULL_AND_INSTALLMENT"
        ) {

            return (
                "Full payment or 3-month installment."
            );
        }


        return (
            "Full payment during enrollment."
        );
    }



    /* =====================================================
       STRUCTURE
       ===================================================== */

    function getStructure(
        program
    ) {

        if (
            program.program_type ===
            "TRAINING_AND_INTERNSHIP"
        ) {

            return `

                <li>
                    Training access
                </li>

                <li>
                    Practical learning
                </li>

                <li>
                    Internship after training completion
                </li>

                <li>
                    Master Admin approval required
                </li>

            `;
        }


        return `

            <li>
                Practical learning
            </li>

            <li>
                Structured internship experience
            </li>

            <li>
                Project-based activities
            </li>

            <li>
                Project work
            </li>

        `;
    }



    /* =====================================================
       TECHNOLOGIES
       ===================================================== */

    function normalizeTechnologies(
        technologies
    ) {

        if (
            Array.isArray(
                technologies
            )
        ) {

            return technologies
                .map(
                    function (item) {

                        return String(
                            item
                        ).trim();

                    }
                )
                .filter(
                    Boolean
                );
        }


        if (
            typeof technologies ===
            "string"
        ) {

            return technologies
                .split(",")
                .map(
                    function (item) {

                        return item.trim();

                    }
                )
                .filter(
                    Boolean
                );
        }


        return [];
    }



    /* =====================================================
       PROGRAM TYPE
       ===================================================== */

    function formatProgramType(
        value
    ) {

        if (!value) {

            return "Program";

        }


        const map = {

            "INTERNSHIP":
                "Internship",

            "TRAINING":
                "Training",

            "TRAINING_AND_INTERNSHIP":
                "Training + Internship"

        };


        return (
            map[value] ||
            String(
                value
            )
                .replaceAll(
                    "_",
                    " "
                )
                .toLowerCase()
                .replace(
                    /\b\w/g,
                    function (letter) {

                        return letter.toUpperCase();

                    }
                )
        );
    }



    /* =====================================================
       LEVEL
       ===================================================== */

    function formatLevel(
        value
    ) {

        if (!value) {

            return "All Levels";

        }


        return String(
            value
        )
            .replaceAll(
                "_",
                " "
            )
            .toLowerCase()
            .replace(
                /\b\w/g,
                function (letter) {

                    return letter.toUpperCase();

                }
            );
    }



    /* =====================================================
       LOADING STATE
       ===================================================== */

    function showLoading(
        programGrid
    ) {

        programGrid.innerHTML = `

            <div
                class="public-program-state"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                "
            >

                <p>
                    Loading available programs...
                </p>

            </div>

        `;
    }



    /* =====================================================
       EMPTY STATE
       ===================================================== */

    function showEmpty(
        programGrid
    ) {

        programGrid.innerHTML = `

            <div
                class="public-program-state"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                "
            >

                <h3>
                    No active programs available
                </h3>

                <p>
                    Please check back soon for available
                    NITRIXA Technologies programs.
                </p>

            </div>

        `;
    }



    /* =====================================================
       ERROR MESSAGE
       ===================================================== */

    function showMessage(
        programGrid,
        message,
        isError
    ) {

        programGrid.innerHTML = `

            <div
                class="public-program-state"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                "
            >

                <h3>
                    ${isError
                        ? "Unable to load programs"
                        : "Programs"
                    }
                </h3>

                <p>
                    ${escapeHtml(
                        message
                    )}
                </p>

            </div>

        `;
    }



    /* =====================================================
       HTML ESCAPE
       ===================================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }



    /* =====================================================
       INITIALIZE
       ===================================================== */

    /*
     * programs.js is loaded with defer.
     *
     * This implementation supports both:
     *
     * 1. Script loaded before DOMContentLoaded
     * 2. Script loaded after DOMContentLoaded
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                startPrograms();

                /*
                 * Auth listener is initialized after
                 * Supabase is available.
                 */

                initializeProgramAuthListener();

            },
            {
                once: true
            }
        );

    } else {

        startPrograms();

        initializeProgramAuthListener();

    }

})();