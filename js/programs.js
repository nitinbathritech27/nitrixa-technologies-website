/* =========================================================
   NITRIXA TECHNOLOGIES
   PUBLIC PROGRAMS
   SUPABASE ACTIVE PROGRAMS
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


        /*
         * NEW UI
         *
         * Internship Programs
         */
        const internshipGrid =
            document.getElementById(
                "internshipProgramGrid"
            );


        /*
         * NEW UI
         *
         * Training + Internship Programs
         */
        const trainingInternshipGrid =
            document.getElementById(
                "trainingInternshipProgramGrid"
            );


        /*
         * OLD WORKING UI FALLBACK
         *
         * Keep this because the original working page
         * used #publicProgramGrid.
         */
        const oldProgramGrid =
            document.getElementById(
                "publicProgramGrid"
            );


        console.log(
            "NITRIXA: Internship grid:",
            internshipGrid
        );


        console.log(
            "NITRIXA: Training + Internship grid:",
            trainingInternshipGrid
        );


        console.log(
            "NITRIXA: Old program grid:",
            oldProgramGrid
        );


        /*
         * =================================================
         * NEW TWO-CATEGORY UI
         * =================================================
         */

        if (
            internshipGrid &&
            trainingInternshipGrid
        ) {

            console.log(
                "NITRIXA: New two-category Programs UI detected."
            );


            loadProgramsForCategories(
                internshipGrid,
                trainingInternshipGrid
            );


            initializeProgramAuthListener();


            return;
        }


        /*
         * =================================================
         * OLD SINGLE-GRID UI
         * =================================================
         */

        if (
            oldProgramGrid
        ) {

            console.log(
                "NITRIXA: Original single program grid detected."
            );


            loadProgramsSingle(
                oldProgramGrid
            );


            initializeProgramAuthListener();


            return;
        }


        /*
         * =================================================
         * SAFETY FALLBACK
         * =================================================
         */

        console.error(
            "NITRIXA: No Programs grid found."
        );


        console.error(
            "NITRIXA: Expected #internshipProgramGrid + #trainingInternshipProgramGrid"
        );

    }



    /* =====================================================
       LOAD PROGRAMS FOR NEW CATEGORY UI
       ===================================================== */

    async function loadProgramsForCategories(
        internshipGrid,
        trainingInternshipGrid
    ) {

        showLoading(
            internshipGrid,
            "Loading internship programs..."
        );


        showLoading(
            trainingInternshipGrid,
            "Loading training + internship programs..."
        );


        if (
            !window.supabaseClient
        ) {

            console.error(
                "NITRIXA: Supabase client is unavailable."
            );


            showMessage(
                internshipGrid,
                "Programs could not be loaded because the Supabase connection is unavailable.",
                true
            );


            showMessage(
                trainingInternshipGrid,
                "Programs could not be loaded because the Supabase connection is unavailable.",
                true
            );


            return;
        }


        console.log(
            "NITRIXA: Supabase client available."
        );


        try {

            /*
             * =================================================
             * ORIGINAL WORKING SUPABASE QUERY
             * =================================================
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


            console.log(
                "NITRIXA: Supabase program response:",
                result
            );


            const data =
                result.data;


            const error =
                result.error;


            /*
             * =================================================
             * QUERY ERROR
             * =================================================
             */

            if (
                error
            ) {

                console.error(
                    "NITRIXA: Supabase program query FAILED."
                );


                console.error(
                    "Error code:",
                    error.code
                );


                console.error(
                    "Error message:",
                    error.message
                );


                console.error(
                    "Error details:",
                    error.details
                );


                console.error(
                    "Error hint:",
                    error.hint
                );


                showMessage(
                    internshipGrid,
                    "Programs could not be loaded. Please try again.",
                    true
                );


                showMessage(
                    trainingInternshipGrid,
                    "Programs could not be loaded. Please try again.",
                    true
                );


                return;
            }


            /*
             * =================================================
             * NORMALIZE DATA
             * =================================================
             */

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


            /*
             * =================================================
             * NO PROGRAMS
             * =================================================
             */

            if (
                programs.length === 0
            ) {

                console.warn(
                    "NITRIXA: No ACTIVE programs found."
                );


                showEmpty(
                    internshipGrid
                );


                showEmpty(
                    trainingInternshipGrid
                );


                updateCategoryCount(
                    "internshipProgramCount",
                    0
                );


                updateCategoryCount(
                    "trainingInternshipProgramCount",
                    0
                );


                return;
            }


            /*
             * =================================================
             * SEPARATE PROGRAM TYPES
             * =================================================
             */

            const internshipPrograms =
                programs.filter(
                    function (
                        program
                    ) {

                        return normalizeType(
                            program.program_type
                        ) ===
                        "INTERNSHIP";

                    }
                );


            const trainingInternshipPrograms =
                programs.filter(
                    function (
                        program
                    ) {

                        return normalizeType(
                            program.program_type
                        ) ===
                        "TRAINING_AND_INTERNSHIP";

                    }
                );


            console.log(
                "NITRIXA: Internship Programs:",
                internshipPrograms.length
            );


            console.log(
                "NITRIXA: Training + Internship Programs:",
                trainingInternshipPrograms.length
            );


            /*
             * =================================================
             * RENDER INTERNSHIP
             * =================================================
             */

            renderPrograms(
                internshipGrid,
                internshipPrograms
            );


            /*
             * =================================================
             * RENDER TRAINING + INTERNSHIP
             * =================================================
             */

            renderPrograms(
                trainingInternshipGrid,
                trainingInternshipPrograms
            );


            /*
             * =================================================
             * UPDATE COUNTERS
             * =================================================
             */

            updateCategoryCount(
                "internshipProgramCount",
                internshipPrograms.length
            );


            updateCategoryCount(
                "trainingInternshipProgramCount",
                trainingInternshipPrograms.length
            );


            /*
             * Also support alternate count IDs if present.
             */

            updateCategoryCount(
                "internshipProgramsCount",
                internshipPrograms.length
            );


            updateCategoryCount(
                "trainingInternshipProgramsCount",
                trainingInternshipPrograms.length
            );


            /*
             * =================================================
             * AUTH-AWARE LINKS
             * =================================================
             */

            await initializeProgramActionLinks();


            console.log(
                "NITRIXA: Programs loaded and rendered successfully."
            );


        } catch (
            error
        ) {

            console.error(
                "NITRIXA: Unexpected Programs error:",
                error
            );


            showMessage(
                internshipGrid,
                "Programs could not be loaded right now.",
                true
            );


            showMessage(
                trainingInternshipGrid,
                "Programs could not be loaded right now.",
                true
            );

        }

    }



    /* =====================================================
       OLD SINGLE GRID LOADER
       ===================================================== */

    async function loadProgramsSingle(
        programGrid
    ) {

        showLoading(
            programGrid,
            "Loading available programs..."
        );


        if (
            !window.supabaseClient
        ) {

            showMessage(
                programGrid,
                "Programs could not be loaded because the Supabase connection is unavailable.",
                true
            );


            return;
        }


        try {

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


            if (
                error
            ) {

                console.error(
                    "NITRIXA: Supabase program query FAILED:",
                    error
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


            if (
                programs.length === 0
            ) {

                showEmpty(
                    programGrid
                );


                return;
            }


            renderPrograms(
                programGrid,
                programs
            );


            await initializeProgramActionLinks();


        } catch (
            error
        ) {

            console.error(
                "NITRIXA: Programs loading error:",
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
       RENDER PROGRAMS
       ===================================================== */

    function renderPrograms(
        grid,
        programs
    ) {

        if (
            !grid
        ) {

            return;
        }


        grid.innerHTML =
            "";


        if (
            !Array.isArray(
                programs
            ) ||
            programs.length === 0
        ) {

            showCategoryEmpty(
                grid
            );


            return;
        }


        programs.forEach(
            function (
                program,
                index
            ) {

                const card =
                    createProgramCard(
                        program,
                        index
                    );


                grid.insertAdjacentHTML(
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
                        5
                    )
                    .map(
                        function (
                            technology
                        ) {

                            return `

                                <span
                                    class="program-tech-pill"
                                >

                                    ${escapeHtml(
                                        technology
                                    )}

                                </span>

                            `;

                        }
                    )
                    .join("")

                : `

                    <span
                        class="program-tech-pill"
                    >
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


        /*
         * =================================================
         * UNIQUE PROGRAM ICON
         * =================================================
         */

        const icon =
            getProgramIcon(
                program
            );


        /*
         * =================================================
         * PROGRAM TYPE LABEL
         * =================================================
         */

        const typeClass =
            normalizeType(
                program.program_type
            ) ===
            "TRAINING_AND_INTERNSHIP"
                ? "training"
                : "internship";


        /*
         * =================================================
         * TRAINING / INTERNSHIP JOURNEY
         * =================================================
         */

        const journey =
            normalizeType(
                program.program_type
            ) ===
            "TRAINING_AND_INTERNSHIP"

                ? `

                    <div class="program-journey">

                        <div class="program-journey-step">

                            <span>
                                01
                            </span>

                            <strong>
                                Training
                            </strong>

                        </div>


                        <div class="program-journey-line"></div>


                        <div class="program-journey-step">

                            <span>
                                02
                            </span>

                            <strong>
                                Internship
                            </strong>

                        </div>

                    </div>

                `

                : `

                    <div class="program-journey program-journey-single">

                        <div class="program-journey-step">

                            <span>
                                ✓
                            </span>

                            <strong>
                                Practical Internship
                            </strong>

                        </div>

                    </div>

                `;


        /*
         * =================================================
         * RETURN CARD
         * =================================================
         */

        return `

            <article
                class="program-card program-card-featured ${typeClass}"
                data-program-id="${escapeHtml(
                    program.id || ""
                )}"
                data-program-type="${escapeHtml(
                    program.program_type || ""
                )}"
            >


                <!-- CARD TOP -->

                <div class="program-card-top">


                    <div class="program-icon">

                        <span>

                            ${icon}

                        </span>

                    </div>


                    <div class="program-card-number">

                        ${String(
                            index + 1
                        ).padStart(
                            2,
                            "0"
                        )}

                    </div>


                </div>



                <!-- PROGRAM CATEGORY -->

                <div class="program-card-category">

                    ${escapeHtml(
                        program.category ||
                        "Technology"
                    )}

                </div>



                <!-- PROGRAM TYPE -->

                <div
                    class="program-card-type ${typeClass}"
                >

                    ${escapeHtml(
                        type
                    )}

                </div>



                <!-- TITLE -->

                <h3 class="program-card-title">

                    ${escapeHtml(
                        program.name ||
                        "Program"
                    )}

                </h3>



                <!-- DESCRIPTION -->

                <p class="program-summary">

                    ${escapeHtml(
                        description
                    )}

                </p>



                <!-- JOURNEY -->

                ${journey}



                <!-- QUICK DETAILS -->

                <div class="program-quick-info">


                    <div class="program-info-item">


                        <span>
                            Duration
                        </span>


                        <strong>

                            ${duration}

                        </strong>


                    </div>



                    <div class="program-info-item">


                        <span>
                            Level
                        </span>


                        <strong>

                            ${escapeHtml(
                                level
                            )}

                        </strong>


                    </div>


                </div>



                <!-- FEE -->

                <div class="program-fee-box">


                    <div>

                        <span>
                            Program Fee
                        </span>


                        <strong>

                            ₹${fee.toLocaleString(
                                "en-IN"
                            )}

                        </strong>

                    </div>


                    <small>

                        ${escapeHtml(
                            payment
                        )}

                    </small>


                </div>



                <!-- TECHNOLOGIES -->

                <div class="program-technologies">


                    <div class="program-section-label">

                        Technology Focus

                    </div>


                    <div class="program-tags">

                        ${technologyHtml}

                    </div>


                </div>



                <!-- PROGRAM STRUCTURE -->

                <div class="program-structure">


                    <div class="program-section-label">

                        What You'll Get

                    </div>


                    <ul>

                        ${structure}

                    </ul>


                </div>



                <!-- CTA -->

                <a
                    href="login.html"
                    class="program-cta"
                    data-program-action="auth"
                    data-program-slug="${escapeHtml(
                        program.slug || ""
                    )}"
                    aria-label="Login or register to explore this program"
                >

                    <span>
                        Explore Program
                    </span>


                    <span
                        class="program-cta-arrow"
                        aria-hidden="true"
                    >
                        →
                    </span>

                </a>


            </article>

        `;

    }



    /* =====================================================
       PROGRAM ICON
       ===================================================== */

    function getProgramIcon(
        program
    ) {

        const text =
            (
                String(
                    program.name || ""
                ) +
                " " +
                String(
                    program.category || ""
                ) +
                " " +
                String(
                    program.technologies || ""
                )
            )
                .toLowerCase();


        /*
         * Use simple symbols instead of external
         * icon dependencies.
         *
         * This keeps the program page reliable even
         * if an icon library is unavailable.
         */

        if (
            text.includes("java")
        ) {

            return "☕";

        }


        if (
            text.includes("python")
        ) {

            return "🐍";

        }


        if (
            text.includes("web") ||
            text.includes("html") ||
            text.includes("frontend")
        ) {

            return "◈";

        }


        if (
            text.includes("full stack") ||
            text.includes("fullstack")
        ) {

            return "▦";

        }


        if (
            text.includes("data") ||
            text.includes("analytics")
        ) {

            return "◫";

        }


        if (
            text.includes("ai") ||
            text.includes("machine learning") ||
            text.includes("ml")
        ) {

            return "✦";

        }


        if (
            text.includes("software")
        ) {

            return "⌘";

        }


        if (
            text.includes("cloud") ||
            text.includes("devops")
        ) {

            return "☁";

        }


        if (
            text.includes("database") ||
            text.includes("sql")
        ) {

            return "▤";

        }


        if (
            text.includes("javascript") ||
            text.includes("js")
        ) {

            return "JS";

        }


        /*
         * Generic NITRIXA technology symbol.
         */

        return "✦";

    }



    /* =====================================================
       DURATION
       ===================================================== */

    function getDuration(
        program
    ) {

        if (
            normalizeType(
                program.program_type
            ) ===
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
            normalizeType(
                program.program_type
            ) ===
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
            normalizeType(
                program.program_type
            ) ===
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
                    function (
                        technology
                    ) {

                        return String(
                            technology
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
                    function (
                        technology
                    ) {

                        return technology.trim();

                    }
                )
                .filter(
                    Boolean
                );

        }


        return [];

    }



    /* =====================================================
       NORMALIZE TYPE
       ===================================================== */

    function normalizeType(
        value
    ) {

        return String(
            value || ""
        )
            .trim()
            .toUpperCase();

    }



    /* =====================================================
       PROGRAM TYPE
       ===================================================== */

    function formatProgramType(
        value
    ) {

        const type =
            normalizeType(
                value
            );


        const map = {

            INTERNSHIP:
                "Internship",

            TRAINING:
                "Training",

            TRAINING_AND_INTERNSHIP:
                "Training + Internship"

        };


        if (
            map[type]
        ) {

            return map[type];

        }


        return (
            String(
                value || "Program"
            )
                .replaceAll(
                    "_",
                    " "
                )
                .toLowerCase()
                .replace(
                    /\b\w/g,
                    function (
                        letter
                    ) {

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

        if (
            !value
        ) {

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
                function (
                    letter
                ) {

                    return letter.toUpperCase();

                }
            );

    }



    /* =====================================================
       LOADING
       ===================================================== */

    function showLoading(
        grid,
        message
    ) {

        if (
            !grid
        ) {

            return;
        }


        grid.innerHTML = `

            <div
                class="public-program-state"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                "
            >

                <p>

                    ${escapeHtml(
                        message ||
                        "Loading available programs..."
                    )}

                </p>

            </div>

        `;

    }



    /* =====================================================
       EMPTY
       ===================================================== */

    function showEmpty(
        grid
    ) {

        if (
            !grid
        ) {

            return;
        }


        grid.innerHTML = `

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
       CATEGORY EMPTY
       ===================================================== */

    function showCategoryEmpty(
        grid
    ) {

        if (
            !grid
        ) {

            return;
        }


        grid.innerHTML = `

            <div
                class="public-program-state"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 50px 20px;
                "
            >

                <p>
                    No programs are currently available in this category.
                </p>

            </div>

        `;

    }



    /* =====================================================
       ERROR
       ===================================================== */

    function showMessage(
        grid,
        message,
        isError
    ) {

        if (
            !grid
        ) {

            return;
        }


        grid.innerHTML = `

            <div
                class="public-program-state"
                style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 60px 20px;
                "
            >

                <h3>

                    ${
                        isError
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
       COUNT
       ===================================================== */

    function updateCategoryCount(
        elementId,
        count
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (
            !element
        ) {

            return;
        }


        const strong =
            element.querySelector(
                "strong"
            );


        if (
            strong
        ) {

            strong.textContent =
                String(
                    count
                );


            return;
        }


        element.textContent =
            String(
                count
            );

    }



    /* =====================================================
       AUTH
       ===================================================== */

    async function initializeProgramActionLinks() {

        if (
            !window.supabaseClient
        ) {

            return;
        }


        try {

            const {
                data,
                error
            } =
                await window.supabaseClient.auth.getSession();


            if (
                error
            ) {

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
                data?.session ||
                null;


            updateProgramActionLinks(
                Boolean(
                    session
                )
            );


        } catch (
            error
        ) {

            console.error(
                "NITRIXA: Authentication error:",
                error
            );


            updateProgramActionLinks(
                false
            );

        }

    }



    /* =====================================================
       UPDATE PROGRAM LINKS
       ===================================================== */

    function updateProgramActionLinks(
        isAuthenticated
    ) {

        const links =
            document.querySelectorAll(
                "[data-program-action]"
            );


        links.forEach(
            function (
                link
            ) {

                const slug =
                    link.getAttribute(
                        "data-program-slug"
                    );


                if (
                    isAuthenticated &&
                    slug
                ) {

                    link.href =
                        "enroll.html?program=" +
                        encodeURIComponent(
                            slug
                        );


                    link.setAttribute(
                        "data-program-action",
                        "enroll"
                    );


                    link.setAttribute(
                        "aria-label",
                        "Continue enrollment for " +
                        getProgramNameFromLink(
                            link
                        )
                    );


                } else {

                    link.href =
                        "login.html";


                    link.setAttribute(
                        "data-program-action",
                        "auth"
                    );


                    link.setAttribute(
                        "aria-label",
                        "Login or register to explore this program"
                    );

                }

            }
        );

    }



    /* =====================================================
       PROGRAM NAME
       ===================================================== */

    function getProgramNameFromLink(
        link
    ) {

        const card =
            link.closest(
                ".program-card"
            );


        if (
            !card
        ) {

            return "this program";

        }


        const heading =
            card.querySelector(
                "h3"
            );


        if (
            !heading
        ) {

            return "this program";

        }


        return (
            heading.textContent ||
            "this program"
        ).trim();

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


                    updateProgramActionLinks(
                        Boolean(
                            session
                        )
                    );

                }
            );

        } catch (
            error
        ) {

            console.error(
                "NITRIXA: Could not initialize program auth listener:",
                error
            );

        }

    }



    /* =====================================================
       ESCAPE HTML
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

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startPrograms,
            {
                once: true
            }
        );

    } else {

        startPrograms();

    }


})();