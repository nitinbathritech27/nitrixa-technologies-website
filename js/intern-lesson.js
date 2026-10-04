(function () {
    "use strict";

    /*
     * NITRIXA TECHNOLOGIES
     * Intern Lesson Module
     *
     * Flow:
     * Authentication
     *      ↓
     * Active Enrollment
     *      ↓
     * Requested Lesson
     *      ↓
     * Published Module
     *      ↓
     * Enrolled Program Validation
     *      ↓
     * Lesson Content
     *      ↓
     * Mark Complete
     */

    const supabaseClient =
        window.supabaseClient;

    if (!supabaseClient) {
        console.error(
            "NITRIXA: Supabase client is not available."
        );

        showError(
            "Learning service is currently unavailable."
        );

        return;
    }

    let currentUser = null;
    let currentEnrollment = null;

    let currentLesson = null;
    let currentModule = null;

    let moduleLessons = [];
    let currentLessonIndex = -1;

    const elements = {
        breadcrumb:
            document.getElementById(
                "lessonBreadcrumb"
            ),

        title:
            document.getElementById(
                "lessonTitle"
            ),

        status:
            document.getElementById(
                "lessonStatus"
            ),

        loading:
            document.getElementById(
                "lessonLoading"
            ),

        error:
            document.getElementById(
                "lessonError"
            ),

        content:
            document.getElementById(
                "lessonContent"
            ),

        markCompleteButton:
            document.getElementById(
                "markCompleteButton"
            ),

        previousLesson:
            document.getElementById(
                "previousLesson"
            ),

        previousLessonTitle:
            document.getElementById(
                "previousLessonTitle"
            ),

        nextLesson:
            document.getElementById(
                "nextLesson"
            ),

        nextLessonTitle:
            document.getElementById(
                "nextLessonTitle"
            ),

        logoutButton:
            document.getElementById(
                "logoutButton"
            )
    };

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

    async function initialize() {
        bindEvents();

        const authenticated =
            await checkAuthentication();

        if (!authenticated) {
            return;
        }

        const lessonId =
            getLessonIdFromUrl();

        if (!lessonId) {
            showError(
                "No lesson was selected."
            );

            return;
        }

        try {
            await loadActiveEnrollment();

            if (!currentEnrollment) {
                showLockedState();
                return;
            }

            await loadLesson(
                lessonId
            );

        } catch (error) {
            console.error(
                "NITRIXA: Lesson initialization failed:",
                error
            );

            showError(
                getErrorMessage(error)
            );
        }
    }

    /*
     * =========================================================
     * EVENTS
     * =========================================================
     */

    function bindEvents() {
        if (
            elements.markCompleteButton
        ) {
            elements.markCompleteButton.addEventListener(
                "click",
                markLessonComplete
            );
        }

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
     * URL
     * =========================================================
     */

    function getLessonIdFromUrl() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        return (
            params.get("id") ||
            ""
        ).trim();
    }

    /*
     * =========================================================
     * ENROLLMENT
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
     * LESSON
     * =========================================================
     */

    async function loadLesson(
        lessonId
    ) {
        setLoading(
            true
        );

        /*
         * First load the requested lesson.
         * Only published lessons are available
         * to interns.
         */
        const {
            data: lesson,
            error: lessonError
        } =
            await supabaseClient
                .from("learning_lessons")
                .select(
                    [
                        "id",
                        "module_id",
                        "title",
                        "content",
                        "lesson_order",
                        "is_published"
                    ].join(", ")
                )
                .eq(
                    "id",
                    lessonId
                )
                .eq(
                    "is_published",
                    true
                )
                .maybeSingle();

        if (lessonError) {
            throw lessonError;
        }

        if (!lesson) {
            showError(
                "This lesson is not available."
            );

            return;
        }

        currentLesson =
            lesson;

        /*
         * Load the module and validate that
         * it is published.
         */
        const {
            data: module,
            error: moduleError
        } =
            await supabaseClient
                .from("learning_modules")
                .select(
                    [
                        "id",
                        "program_id",
                        "title",
                        "module_order",
                        "is_published"
                    ].join(", ")
                )
                .eq(
                    "id",
                    lesson.module_id
                )
                .eq(
                    "is_published",
                    true
                )
                .maybeSingle();

        if (moduleError) {
            throw moduleError;
        }

        if (!module) {
            showError(
                "The module for this lesson is not available."
            );

            return;
        }

        /*
         * Security check:
         * lesson's module must belong to the
         * user's enrolled program.
         */
        if (
            !currentEnrollment ||
            module.program_id !==
                currentEnrollment.program_id
        ) {
            showError(
                "You do not have access to this lesson."
            );

            return;
        }

        currentModule =
            module;

        await loadModuleLessons();

        currentLessonIndex =
            moduleLessons.findIndex(
                function (item) {
                    return (
                        item.id ===
                        currentLesson.id
                    );
                }
            );

        await loadCompletionStatus();

        renderLesson();

        setLoading(
            false
        );
    }

    /*
     * =========================================================
     * MODULE LESSONS
     * =========================================================
     */

    async function loadModuleLessons() {
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
                .eq(
                    "module_id",
                    currentModule.id
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

        moduleLessons =
            data || [];
    }

    /*
     * =========================================================
     * COMPLETION
     * =========================================================
     */

    async function loadCompletionStatus() {
        const {
            data,
            error
        } =
            await supabaseClient
                .from("lesson_progress")
                .select(
                    [
                        "id",
                        "lesson_id",
                        "completed_at"
                    ].join(", ")
                )
                .eq(
                    "user_id",
                    currentUser.id
                )
                .eq(
                    "lesson_id",
                    currentLesson.id
                )
                .maybeSingle();

        if (error) {
            throw error;
        }

        currentLesson.completed =
            Boolean(data);
    }

    async function markLessonComplete() {
        if (
            !currentLesson ||
            !currentUser
        ) {
            return;
        }

        if (
            currentLesson.completed
        ) {
            return;
        }

        if (
            !elements.markCompleteButton
        ) {
            return;
        }

        elements.markCompleteButton.disabled =
            true;

        elements.markCompleteButton.textContent =
            "Saving...";

        try {
            const {
                error
            } =
                await supabaseClient
                    .from("lesson_progress")
                    .upsert(
                        {
                            user_id:
                                currentUser.id,

                            lesson_id:
                                currentLesson.id,

                            completed_at:
                                new Date().toISOString()
                        },
                        {
                            onConflict:
                                "user_id,lesson_id"
                        }
                    );

            if (error) {
                throw error;
            }

            currentLesson.completed =
                true;

            updateCompletionUI();

        } catch (error) {
            console.error(
                "NITRIXA: Failed to mark lesson complete:",
                error
            );

            elements.markCompleteButton.disabled =
                false;

            elements.markCompleteButton.textContent =
                "Mark as Complete";

            alert(
                getErrorMessage(error)
            );
        }
    }

    /*
     * =========================================================
     * RENDER LESSON
     * =========================================================
     */

    function renderLesson() {
        if (!currentLesson) {
            return;
        }

        if (elements.title) {
            elements.title.textContent =
                currentLesson.title ||
                "Lesson";
        }

        if (elements.breadcrumb) {
            elements.breadcrumb.textContent =
                buildBreadcrumb();
        }

        if (elements.content) {
            elements.content.textContent =
                currentLesson.content ||
                "No lesson content is available.";
        }

        updateCompletionUI();

        renderLessonNavigation();
    }

    function buildBreadcrumb() {
        const moduleOrder =
            currentModule &&
            currentModule.module_order
                ? currentModule.module_order
                : "";

        const lessonOrder =
            currentLesson &&
            currentLesson.lesson_order
                ? currentLesson.lesson_order
                : "";

        const moduleTitle =
            currentModule &&
            currentModule.title
                ? currentModule.title
                : "Module";

        return (
            "Module " +
            moduleOrder +
            " · " +
            moduleTitle +
            " · Lesson " +
            lessonOrder
        );
    }

    function updateCompletionUI() {
        const completed =
            Boolean(
                currentLesson &&
                currentLesson.completed
            );

        if (elements.status) {
            elements.status.classList.toggle(
                "completed",
                completed
            );

            elements.status.classList.toggle(
                "pending",
                !completed
            );

            elements.status.textContent =
                completed
                    ? "✓ Completed"
                    : "Lesson not completed";
        }

        if (
            elements.markCompleteButton
        ) {
            elements.markCompleteButton.disabled =
                completed;

            elements.markCompleteButton.classList.toggle(
                "completed",
                completed
            );

            elements.markCompleteButton.textContent =
                completed
                    ? "✓ Completed"
                    : "Mark as Complete";
        }
    }

    /*
     * =========================================================
     * PREVIOUS / NEXT
     * =========================================================
     */

    function renderLessonNavigation() {
        if (
            !currentLesson ||
            currentLessonIndex < 0
        ) {
            return;
        }

        const previousLesson =
            currentLessonIndex > 0
                ? moduleLessons[
                      currentLessonIndex - 1
                  ]
                : null;

        const nextLesson =
            currentLessonIndex <
            moduleLessons.length - 1
                ? moduleLessons[
                      currentLessonIndex + 1
                  ]
                : null;

        renderPreviousLesson(
            previousLesson
        );

        renderNextLesson(
            nextLesson
        );
    }

    function renderPreviousLesson(
        lesson
    ) {
        if (
            !elements.previousLesson
        ) {
            return;
        }

        if (!lesson) {
            elements.previousLesson.hidden =
                true;

            return;
        }

        elements.previousLesson.hidden =
            false;

        elements.previousLesson.href =
            buildLessonUrl(
                lesson.id
            );

        if (
            elements.previousLessonTitle
        ) {
            elements.previousLessonTitle.textContent =
                lesson.title ||
                "Previous lesson";
        }
    }

    function renderNextLesson(
        lesson
    ) {
        if (
            !elements.nextLesson
        ) {
            return;
        }

        if (!lesson) {
            elements.nextLesson.hidden =
                true;

            return;
        }

        elements.nextLesson.hidden =
            false;

        elements.nextLesson.href =
            buildLessonUrl(
                lesson.id
            );

        if (
            elements.nextLessonTitle
        ) {
            elements.nextLessonTitle.textContent =
                lesson.title ||
                "Next lesson";
        }
    }

    function buildLessonUrl(
        lessonId
    ) {
        return (
            "lesson.html?id=" +
            encodeURIComponent(
                lessonId
            )
        );
    }

    /*
     * =========================================================
     * STATES
     * =========================================================
     */

    function setLoading(
        isLoading
    ) {
        if (elements.loading) {
            elements.loading.hidden =
                !isLoading;
        }

        if (isLoading) {
            if (elements.error) {
                elements.error.hidden =
                    true;
            }

            if (elements.content) {
                elements.content.textContent =
                    "";
            }
        }
    }

    function showLockedState() {
        setLoading(
            false
        );

        if (elements.title) {
            elements.title.textContent =
                "Learning Locked";
        }

        if (elements.breadcrumb) {
            elements.breadcrumb.textContent =
                "Learning";
        }

        if (elements.content) {
            elements.content.textContent =
                "An active enrollment is required to access this lesson.";
        }

        if (elements.status) {
            elements.status.className =
                "lesson-status pending";

            elements.status.textContent =
                "Enrollment required";
        }

        if (
            elements.markCompleteButton
        ) {
            elements.markCompleteButton.disabled =
                true;
        }

        hideNavigation();
    }

    function showError(
        message
    ) {
        setLoading(
            false
        );

        if (elements.error) {
            elements.error.hidden =
                false;

            elements.error.textContent =
                message;
        }

        if (elements.content) {
            elements.content.textContent =
                "";
        }

        if (
            elements.markCompleteButton
        ) {
            elements.markCompleteButton.disabled =
                true;
        }

        hideNavigation();
    }

    function hideNavigation() {
        if (
            elements.previousLesson
        ) {
            elements.previousLesson.hidden =
                true;
        }

        if (
            elements.nextLesson
        ) {
            elements.nextLesson.hidden =
                true;
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
     * HELPERS
     * =========================================================
     */

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
            "Unable to load the lesson."
        );
    }
})();