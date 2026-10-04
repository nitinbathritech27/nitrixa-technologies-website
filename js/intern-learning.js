(function () {
    "use strict";

    /*
     * =========================================================
     * NITRIXA TECHNOLOGIES
     * Intern Learning Module
     *
     * Flow:
     * Authenticated User
     *       ↓
     * Active Enrollment
     *       ↓
     * Enrolled Program
     *       ↓
     * Published Learning Modules
     *       ↓
     * Published Lessons
     *       ↓
     * Lesson Progress
     * =========================================================
     */

    const supabaseClient = window.supabaseClient;

    let currentUser = null;
    let currentEnrollment = null;
    let currentProgram = null;

    let modules = [];
    let lessons = [];
    let progress = [];

    const elements = {
        programName: document.getElementById(
            "learningProgramName"
        ),

        overallProgressValue: document.getElementById(
            "overallProgressValue"
        ),

        overallProgressFill: document.getElementById(
            "overallProgressFill"
        ),

        moduleCount: document.getElementById(
            "moduleCount"
        ),

        lessonCount: document.getElementById(
            "lessonCount"
        ),

        completedLessonCount: document.getElementById(
            "completedLessonCount"
        ),

        learningContent: document.getElementById(
            "learningContent"
        ),

        learningStatus: document.getElementById(
            "learningStatus"
        ),

        logoutButton: document.getElementById(
            "logoutButton"
        ),

        sidebarInternName: document.getElementById(
            "sidebarInternName"
        ),

        sidebarInternId: document.getElementById(
            "sidebarInternId"
        ),

        sidebarAvatar: document.getElementById(
            "sidebarAvatar"
        ),

        topUserName: document.getElementById(
            "topUserName"
        ),

        topAvatar: document.getElementById(
            "topAvatar"
        )
    };


    /*
     * =========================================================
     * INITIALIZATION
     * =========================================================
     */

    function start() {
        initialize();
    }


    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            start,
            {
                once: true
            }
        );
    } else {
        start();
    }


    async function initialize() {

        if (!supabaseClient) {

            console.error(
                "NITRIXA: Supabase client is not available."
            );

            showError(
                "Learning service is currently unavailable."
            );

            return;
        }

        bindEvents();

        const authenticated =
            await checkAuthentication();

        if (!authenticated) {
            return;
        }

        await loadUserProfile();

        await loadLearningData();
    }


    /*
     * =========================================================
     * EVENTS
     * =========================================================
     */

    function bindEvents() {

        if (elements.logoutButton) {

            elements.logoutButton.addEventListener(
                "click",
                logout
            );

        }
    }


    /*
     * =========================================================
     * AUTHENTICATION
     * =========================================================
     */

    async function checkAuthentication() {

        try {

            const {
                data,
                error
            } =
                await supabaseClient.auth.getSession();


            if (error) {
                throw error;
            }


            if (
                !data ||
                !data.session ||
                !data.session.user
            ) {

                redirectToLogin();

                return false;
            }


            currentUser =
                data.session.user;


            return true;


        } catch (error) {

            console.error(
                "NITRIXA: Authentication check failed:",
                error
            );

            redirectToLogin();

            return false;
        }
    }


    function redirectToLogin() {

        window.location.href =
            "../login.html";
    }


    /*
     * =========================================================
     * USER PROFILE
     * =========================================================
     *
     * This section is intentionally lightweight.
     * It only updates the existing portal header/sidebar.
     */

    async function loadUserProfile() {

        if (!currentUser) {
            return;
        }

        const metadata =
            currentUser.user_metadata || {};

        const fullName =
            metadata.full_name ||
            metadata.name ||
            metadata.display_name ||
            "";

        const fallbackName =
            currentUser.email
                ? currentUser.email.split("@")[0]
                : "Intern";

        const displayName =
            fullName.trim() ||
            fallbackName;

        updateUserInterface(
            displayName,
            null
        );
    }


    function updateUserInterface(
        displayName,
        internId
    ) {

        const safeName =
            displayName || "Intern";

        const initial =
            safeName
                .trim()
                .charAt(0)
                .toUpperCase() || "I";


        if (elements.sidebarInternName) {

            elements.sidebarInternName.textContent =
                safeName;
        }


        if (elements.sidebarInternId) {

            elements.sidebarInternId.textContent =
                internId || "Intern ID";
        }


        if (elements.sidebarAvatar) {

            elements.sidebarAvatar.textContent =
                initial;
        }


        if (elements.topUserName) {

            elements.topUserName.textContent =
                safeName;
        }


        if (elements.topAvatar) {

            elements.topAvatar.textContent =
                initial;
        }
    }


    /*
     * =========================================================
     * MAIN LEARNING FLOW
     * =========================================================
     */

    async function loadLearningData() {

        setStatus(
            "Loading your learning content..."
        );


        try {

            await loadActiveEnrollment();


            if (!currentEnrollment) {

                showLockedState();

                return;
            }


            await loadProgram();


            if (!currentProgram) {

                showError(
                    "Your enrolled program could not be found."
                );

                return;
            }


            await loadModules();


            if (modules.length === 0) {

                showNoContentState();

                return;
            }


            await loadLessons();


            await loadProgress();


            renderLearning();


        } catch (error) {

            console.error(
                "NITRIXA: Learning data loading failed:",
                error
            );


            showError(
                getErrorMessage(error)
            );
        }
    }


    /*
     * =========================================================
     * ACTIVE ENROLLMENT
     * =========================================================
     */

    async function loadActiveEnrollment() {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("enrollments")
                .select(
                    [
                        "id",
                        "user_id",
                        "program_id",
                        "batch_id",
                        "enrollment_path",
                        "status",
                        "amount",
                        "created_at"
                    ].join(", ")
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .eq(
                    "status",
                    "ACTIVE"
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(1)
                .maybeSingle();


        if (error) {
            throw error;
        }


        currentEnrollment =
            data || null;
    }


    /*
     * =========================================================
     * PROGRAM
     * =========================================================
     *
     * IMPORTANT:
     * Current programs table uses:
     *     name
     *     program_type
     *
     * It does NOT use:
     *     title
     *     type
     * =========================================================
     */

    async function loadProgram() {

        if (
            !currentEnrollment ||
            !currentEnrollment.program_id
        ) {

            currentProgram = null;

            return;
        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("programs")
                .select(
                    [
                        "id",
                        "name",
                        "program_type",
                        "status"
                    ].join(", ")
                )
                .eq(
                    "id",
                    currentEnrollment.program_id
                )
                .maybeSingle();


        if (error) {
            throw error;
        }


        currentProgram =
            data || null;


        updateProgramName();
    }


    function updateProgramName() {

        if (!elements.programName) {
            return;
        }


        if (!currentProgram) {

            elements.programName.textContent =
                "Program unavailable";

            return;
        }


        elements.programName.textContent =
            currentProgram.name ||
            "Your Program";
    }


    /*
     * =========================================================
     * MODULES
     * =========================================================
     */

    async function loadModules() {

        if (
            !currentEnrollment ||
            !currentEnrollment.program_id
        ) {

            modules = [];

            return;
        }


        const {
            data,
            error
        } =
            await supabaseClient
                .from("learning_modules")
                .select(
                    [
                        "id",
                        "program_id",
                        "title",
                        "description",
                        "module_order"
                    ].join(", ")
                )
                .eq(
                    "program_id",
                    currentEnrollment.program_id
                )
                .eq(
                    "is_published",
                    true
                )
                .order(
                    "module_order",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        modules =
            data || [];
    }


    /*
     * =========================================================
     * LESSONS
     * =========================================================
     */

    async function loadLessons() {

        if (
            modules.length === 0
        ) {

            lessons = [];

            return;
        }


        const moduleIds =
            modules.map(
                function (module) {
                    return module.id;
                }
            );


        const {
            data,
            error
        } =
            await supabaseClient
                .from("learning_lessons")
                .select(
                    [
                        "id",
                        "module_id",
                        "title",
                        "lesson_order"
                    ].join(", ")
                )
                .in(
                    "module_id",
                    moduleIds
                )
                .eq(
                    "is_published",
                    true
                )
                .order(
                    "lesson_order",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        lessons =
            data || [];
    }


    /*
     * =========================================================
     * PROGRESS
     * =========================================================
     */

    async function loadProgress() {

        if (
            lessons.length === 0
        ) {

            progress = [];

            return;
        }


        const lessonIds =
            lessons.map(
                function (lesson) {
                    return lesson.id;
                }
            );


        const {
            data,
            error
        } =
            await supabaseClient
                .from("lesson_progress")
                .select(
                    [
                        "id",
                        "user_id",
                        "lesson_id",
                        "completed_at"
                    ].join(", ")
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .in(
                    "lesson_id",
                    lessonIds
                );


        if (error) {
            throw error;
        }


        progress =
            data || [];
    }


    /*
     * =========================================================
     * RENDER
     * =========================================================
     */

    function renderLearning() {

        const totalLessons =
            lessons.length;


        const completedLessons =
            getCompletedLessonCount();


        const overallProgress =
            calculatePercentage(
                completedLessons,
                totalLessons
            );


        updateSummary(
            modules.length,
            totalLessons,
            completedLessons
        );


        updateOverallProgress(
            overallProgress
        );


        renderModules();


        setStatus(
            totalLessons > 0
                ? "Learning content loaded."
                : "No lessons available yet."
        );
    }


    function renderModules() {

        if (!elements.learningContent) {
            return;
        }


        elements.learningContent.innerHTML =
            "";


        modules.forEach(
            function (module) {

                const moduleLessons =
                    lessons.filter(
                        function (lesson) {

                            return (
                                lesson.module_id ===
                                module.id
                            );
                        }
                    );


                const completedCount =
                    moduleLessons.filter(
                        function (lesson) {

                            return isLessonCompleted(
                                lesson.id
                            );
                        }
                    ).length;


                const moduleProgress =
                    calculatePercentage(
                        completedCount,
                        moduleLessons.length
                    );


                const moduleElement =
                    document.createElement(
                        "article"
                    );


                moduleElement.className =
                    "learning-module";


                moduleElement.innerHTML =
                    createModuleMarkup(
                        module,
                        moduleLessons,
                        completedCount,
                        moduleProgress
                    );


                elements.learningContent.appendChild(
                    moduleElement
                );
            }
        );
    }


    function createModuleMarkup(
        module,
        moduleLessons,
        completedCount,
        moduleProgress
    ) {

        const description =
            module.description ||
            "";


        const lessonsMarkup =
            moduleLessons.length > 0
                ? moduleLessons
                    .map(
                        function (lesson) {

                            return createLessonMarkup(
                                lesson
                            );
                        }
                    )
                    .join("")
                : `
                    <div
                        class="learning-empty"
                        style="margin: 14px 20px 18px;"
                    >
                        <p>
                            No published lessons are available
                            in this module yet.
                        </p>
                    </div>
                `;


        return `
            <div class="learning-module-header">

                <div class="learning-module-info">

                    <div class="learning-module-heading">

                        <span
                            class="learning-module-order"
                        >
                            ${escapeHtml(
                                module.module_order
                            )}
                        </span>

                        <h3
                            class="learning-module-title"
                        >
                            ${escapeHtml(
                                module.title
                            )}
                        </h3>

                    </div>

                    ${
                        description
                            ? `
                                <p
                                    class="learning-module-description"
                                >
                                    ${escapeHtml(
                                        description
                                    )}
                                </p>
                            `
                            : ""
                    }

                </div>


                <div
                    class="learning-module-progress"
                >

                    <span
                        class="learning-module-progress-value"
                    >
                        ${moduleProgress}% complete
                    </span>

                    <div
                        class="learning-module-progress-bar"
                        aria-label="Module progress"
                    >

                        <div
                            class="learning-module-progress-fill"
                            style="width: ${moduleProgress}%"
                        ></div>

                    </div>

                </div>

            </div>


            <div
                class="learning-lessons"
            >
                ${lessonsMarkup}
            </div>
        `;
    }


    function createLessonMarkup(
        lesson
    ) {

        const completed =
            isLessonCompleted(
                lesson.id
            );


        return `
            <a
                href="lesson.html?id=${encodeURIComponent(
                    lesson.id
                )}"
                class="learning-lesson"
                aria-label="Open lesson ${escapeAttribute(
                    lesson.title
                )}"
            >

                <div
                    class="learning-lesson-info"
                >

                    <span
                        class="learning-lesson-title"
                    >
                        ${escapeHtml(
                            lesson.lesson_order
                        )}.
                        ${escapeHtml(
                            lesson.title
                        )}
                    </span>

                    <span
                        class="learning-lesson-subtitle"
                    >
                        Open lesson
                    </span>

                </div>


                <span
                    class="learning-lesson-status ${
                        completed
                            ? "completed"
                            : "pending"
                    }"
                >
                    ${
                        completed
                            ? "✓ Completed"
                            : "Pending"
                    }
                </span>

            </a>
        `;
    }


    /*
     * =========================================================
     * PROGRESS CALCULATIONS
     * =========================================================
     */

    function getCompletedLessonCount() {

        return lessons.filter(
            function (lesson) {

                return isLessonCompleted(
                    lesson.id
                );

            }
        ).length;
    }


    function isLessonCompleted(
        lessonId
    ) {

        return progress.some(
            function (item) {

                return (
                    item.lesson_id ===
                    lessonId
                );

            }
        );
    }


    function calculatePercentage(
        completed,
        total
    ) {

        if (
            !total ||
            total <= 0
        ) {

            return 0;
        }


        return Math.round(
            (
                completed /
                total
            ) * 100
        );
    }


    function updateSummary(
        moduleCount,
        lessonCount,
        completedCount
    ) {

        if (elements.moduleCount) {

            elements.moduleCount.textContent =
                moduleCount;
        }


        if (elements.lessonCount) {

            elements.lessonCount.textContent =
                lessonCount;
        }


        if (
            elements.completedLessonCount
        ) {

            elements.completedLessonCount.textContent =
                completedCount;
        }
    }


    function updateOverallProgress(
        percentage
    ) {

        if (
            elements.overallProgressValue
        ) {

            elements.overallProgressValue.textContent =
                percentage + "%";
        }


        if (
            elements.overallProgressFill
        ) {

            elements.overallProgressFill.style.width =
                percentage + "%";
        }
    }


    /*
     * =========================================================
     * LOCKED / EMPTY / ERROR STATES
     * =========================================================
     */

    function showLockedState() {

        updateProgramName();


        updateSummary(
            0,
            0,
            0
        );


        updateOverallProgress(
            0
        );


        if (
            elements.learningContent
        ) {

            elements.learningContent.innerHTML = `
                <div
                    class="learning-empty"
                >

                    <h3>
                        Learning is locked
                    </h3>

                    <p>
                        An active enrollment is required
                        to access your learning content.
                    </p>

                </div>
            `;
        }


        setStatus(
            "Active enrollment required."
        );
    }


    function showNoContentState() {

        updateSummary(
            0,
            0,
            0
        );


        updateOverallProgress(
            0
        );


        if (
            elements.learningContent
        ) {

            elements.learningContent.innerHTML = `
                <div
                    class="learning-empty"
                >

                    <h3>
                        Learning content is not available yet
                    </h3>

                    <p>
                        Your program is active, but learning
                        modules have not been published yet.
                    </p>

                </div>
            `;
        }


        setStatus(
            "No published learning modules."
        );
    }


    function showError(
        message
    ) {

        if (
            elements.learningContent
        ) {

            elements.learningContent.innerHTML = `
                <div
                    class="learning-error"
                >
                    ${escapeHtml(
                        message
                    )}
                </div>
            `;
        }


        setStatus(
            "Unable to load learning content."
        );
    }


    /*
     * =========================================================
     * STATUS
     * =========================================================
     */

    function setStatus(
        message
    ) {

        if (
            elements.learningStatus
        ) {

            elements.learningStatus.textContent =
                message || "";
        }
    }


    /*
     * =========================================================
     * LOGOUT
     * =========================================================
     */

    async function logout() {

        try {

            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (error) {
                throw error;
            }


            window.location.href =
                "../index.html";


        } catch (error) {

            console.error(
                "NITRIXA: Logout failed:",
                error
            );


            alert(
                "Logout failed. Please try again."
            );
        }
    }


    /*
     * =========================================================
     * SECURITY / OUTPUT HELPERS
     * =========================================================
     */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );
    }


    function escapeAttribute(
        value
    ) {

        return escapeHtml(
            value
        );
    }


    function getErrorMessage(
        error
    ) {

        if (!error) {

            return (
                "An unexpected error occurred."
            );
        }


        return (
            error.message ||
            error.details ||
            error.hint ||
            "Unable to load learning content."
        );
    }

})();