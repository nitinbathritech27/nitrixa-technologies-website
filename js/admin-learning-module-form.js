(function () {
    "use strict";

    /*
     * =========================================================
     * NITRIXA TECHNOLOGIES
     * ADMIN LEARNING LESSON FORM
     * =========================================================
     *
     * Responsibilities:
     *
     * 1. Verify Supabase client
     * 2. Verify authenticated user
     * 3. Verify admin authorization
     * 4. Read module ID from URL
     * 5. Support CREATE and EDIT modes
     * 6. Load selected module
     * 7. Load existing lesson in EDIT mode
     * 8. Calculate next lesson order in CREATE mode
     * 9. Validate lesson form
     * 10. Create learning lesson
     * 11. Update learning lesson
     * 12. Preserve publication status during EDIT
     * 13. Show loading / success / error states
     * 14. Redirect back to Learning Management
     *
     * URL formats:
     *
     * CREATE:
     * learning-lesson-form.html?module=MODULE_ID
     *
     * EDIT:
     * learning-lesson-form.html?module=MODULE_ID&lesson=LESSON_ID
     *
     * Existing architecture preserved:
     * HTML + Vanilla JS + Supabase
     *
     * No framework introduced.
     * No database structure changed.
     * =========================================================
     */


    /* =========================================================
       SUPABASE CLIENT
       ========================================================= */

    const supabaseClient =
        window.supabaseClient;


    if (!supabaseClient) {

        console.error(
            "NITRIXA: Supabase client is not available."
        );

        showFatalError(
            "Supabase could not be initialized. Please refresh the page."
        );

        return;
    }


    /* =========================================================
       DOM ELEMENTS
       ========================================================= */

    const elements = {

        form:
            document.getElementById(
                "learningLessonForm"
            ),

        status:
            document.getElementById(
                "learningLessonFormStatus"
            ),

        moduleName:
            document.getElementById(
                "selectedModuleName"
            ),

        moduleId:
            document.getElementById(
                "lessonModuleId"
            ),

        title:
            document.getElementById(
                "lessonTitle"
            ),

        titleCounter:
            document.getElementById(
                "lessonTitleCounter"
            ),

        content:
            document.getElementById(
                "lessonContent"
            ),

        contentCounter:
            document.getElementById(
                "lessonContentCounter"
            ),

        order:
            document.getElementById(
                "lessonOrder"
            ),

        submitButton:
            document.getElementById(
                "createLessonSubmitButton"
            )

    };


    /* =========================================================
       STATE
       ========================================================= */

    let selectedModule = null;

    let existingLesson = null;

    let submitting = false;

    let editMode = false;


    /* =========================================================
       INITIALIZATION
       ========================================================= */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }


    async function initialize() {

        bindEvents();


        const elementsReady =
            validateRequiredElements();


        if (!elementsReady) {
            return;
        }


        setFormDisabled(true);


        updateFormMode();


        const isAdmin =
            await checkAdminAccess();


        if (!isAdmin) {
            return;
        }


        const urlData =
            getUrlData();


        if (!urlData.moduleId) {

            showStatus(
                "No module was selected. Please return to Learning Management and select a module first.",
                "error"
            );

            return;
        }


        editMode =
            Boolean(
                urlData.lessonId
            );


        updateFormMode();


        await loadModule(
            urlData.moduleId
        );


        if (
            !selectedModule
        ) {
            return;
        }


        if (editMode) {

            await loadLesson(
                urlData.lessonId
            );

        } else {

            await prepareCreateMode();

        }

    }


    /* =========================================================
       EVENT BINDINGS
       ========================================================= */

    function bindEvents() {

        if (
            elements.form
        ) {

            elements.form.addEventListener(
                "submit",
                handleSubmit
            );

        }


        if (
            elements.title
        ) {

            elements.title.addEventListener(
                "input",
                function () {

                    updateCharacterCounters();

                    clearFieldError();

                }
            );

        }


        if (
            elements.content
        ) {

            elements.content.addEventListener(
                "input",
                function () {

                    updateCharacterCounters();

                    clearFieldError();

                }
            );

        }


        if (
            elements.order
        ) {

            elements.order.addEventListener(
                "input",
                clearFieldError
            );

        }

    }


    /* =========================================================
       REQUIRED DOM VALIDATION
       ========================================================= */

    function validateRequiredElements() {

        const missing = [];


        Object.keys(
            elements
        ).forEach(
            function (key) {

                if (
                    !elements[key]
                ) {

                    missing.push(
                        key
                    );

                }

            }
        );


        if (
            missing.length > 0
        ) {

            console.error(
                "NITRIXA: Learning lesson form elements missing:",
                missing
            );


            showFatalError(
                "The Learning Lesson form could not be initialized correctly."
            );


            return false;
        }


        return true;

    }


    /* =========================================================
       ADMIN AUTHENTICATION
       ========================================================= */

    async function checkAdminAccess() {

        try {

            const {
                data: sessionData,
                error: sessionError
            } =
                await supabaseClient.auth.getSession();


            if (
                sessionError
            ) {

                console.error(
                    "NITRIXA: Session check failed:",
                    sessionError
                );


                showStatus(
                    "Unable to verify your login session.",
                    "error"
                );


                return false;
            }


            if (
                !sessionData ||
                !sessionData.session
            ) {

                redirectToLogin();

                return false;
            }


            const {
                data: adminData,
                error: adminError
            } =
                await supabaseClient.rpc(
                    "is_admin"
                );


            if (
                adminError
            ) {

                console.error(
                    "NITRIXA: Admin verification failed:",
                    adminError
                );


                showStatus(
                    "Unable to verify administrator access.",
                    "error"
                );


                return false;
            }


            if (
                adminData !== true
            ) {

                showStatus(
                    "You are not authorized to manage learning lessons.",
                    "error"
                );


                setTimeout(
                    function () {

                        redirectToLogin();

                    },
                    1200
                );


                return false;
            }


            return true;


        } catch (error) {

            console.error(
                "NITRIXA: Admin access check failed:",
                error
            );


            showStatus(
                "Unable to verify administrator access.",
                "error"
            );


            return false;
        }

    }


    function redirectToLogin() {

        window.location.href =
            "../login.html";

    }


    /* =========================================================
       URL
       ========================================================= */

    function getUrlData() {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return {

            moduleId:
                (
                    params.get(
                        "module"
                    ) || ""
                ).trim(),

            lessonId:
                (
                    params.get(
                        "lesson"
                    ) || ""
                ).trim()

        };

    }


    /* =========================================================
       FORM MODE
       ========================================================= */

    function updateFormMode() {

        if (
            !elements.submitButton
        ) {
            return;
        }


        if (
            editMode
        ) {

            elements.submitButton.textContent =
                "Update Lesson";


            document.title =
                "Edit Learning Lesson | NITRIXA TECHNOLOGIES";


        } else {

            elements.submitButton.textContent =
                "Create Lesson";


            document.title =
                "Create Learning Lesson | NITRIXA TECHNOLOGIES";

        }

    }


    /* =========================================================
       LOAD MODULE
       ========================================================= */

    async function loadModule(
        moduleId
    ) {

        showStatus(
            "Loading module information...",
            "loading"
        );


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "learning_modules"
                    )
                    .select(
                        [
                            "id",
                            "program_id",
                            "title",
                            "description",
                            "module_order",
                            "is_published"
                        ].join(",")
                    )
                    .eq(
                        "id",
                        moduleId
                    )
                    .maybeSingle();


            if (
                error
            ) {

                throw error;

            }


            if (
                !data
            ) {

                showStatus(
                    "The selected module could not be found.",
                    "error"
                );


                return;
            }


            selectedModule =
                data;


            if (
                elements.moduleId
            ) {

                elements.moduleId.value =
                    data.id;

            }


            if (
                elements.moduleName
            ) {

                elements.moduleName.textContent =
                    data.title ||
                    "Learning Module";

            }


        } catch (error) {

            console.error(
                "NITRIXA: Failed to load module:",
                error
            );


            showStatus(
                "Unable to load the selected module.",
                "error"
            );

        }

    }


    /* =========================================================
       LOAD LESSON - EDIT MODE
       ========================================================= */

    async function loadLesson(
        lessonId
    ) {

        showStatus(
            "Loading lesson...",
            "loading"
        );


        setFormDisabled(true);


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "learning_lessons"
                    )
                    .select(
                        [
                            "id",
                            "module_id",
                            "title",
                            "content",
                            "lesson_order",
                            "is_published",
                            "created_at",
                            "updated_at"
                        ].join(",")
                    )
                    .eq(
                        "id",
                        lessonId
                    )
                    .eq(
                        "module_id",
                        selectedModule.id
                    )
                    .maybeSingle();


            if (
                error
            ) {

                throw error;

            }


            if (
                !data
            ) {

                showStatus(
                    "The selected lesson could not be found.",
                    "error"
                );


                return;
            }


            existingLesson =
                data;


            if (
                elements.title
            ) {

                elements.title.value =
                    data.title ||
                    "";

            }


            if (
                elements.content
            ) {

                elements.content.value =
                    data.content ||
                    "";

            }


            if (
                elements.order
            ) {

                elements.order.value =
                    Number(
                        data.lesson_order || 1
                    );

            }


            updateCharacterCounters();


            updateFormMode();


            setFormDisabled(false);


            showStatus(
                "Lesson loaded. You can update the details.",
                "ready"
            );


        } catch (error) {

            console.error(
                "NITRIXA: Failed to load lesson:",
                error
            );


            showStatus(
                "Unable to load the selected lesson.",
                "error"
            );

        }

    }


    /* =========================================================
       PREPARE CREATE MODE
       ========================================================= */

    async function prepareCreateMode() {

        showStatus(
            "Preparing lesson form...",
            "loading"
        );


        try {

            const nextOrder =
                await getNextLessonOrder(
                    selectedModule.id
                );


            if (
                elements.order
            ) {

                elements.order.value =
                    nextOrder;

            }


            existingLesson =
                null;


            updateCharacterCounters();


            updateFormMode();


            setFormDisabled(false);


            showStatus(
                "Ready to create a new lesson.",
                "ready"
            );


        } catch (error) {

            console.error(
                "NITRIXA: Failed to prepare lesson form:",
                error
            );


            showStatus(
                "Unable to prepare the lesson form.",
                "error"
            );

        }

    }


    /* =========================================================
       NEXT LESSON ORDER
       ========================================================= */

    async function getNextLessonOrder(
        moduleId
    ) {

        const {
            data,
            error
        } =
            await supabaseClient
                .from(
                    "learning_lessons"
                )
                .select(
                    "lesson_order"
                )
                .eq(
                    "module_id",
                    moduleId
                )
                .order(
                    "lesson_order",
                    {
                        ascending: false
                    }
                )
                .limit(
                    1
                );


        if (
            error
        ) {

            throw error;

        }


        if (
            !data ||
            data.length === 0
        ) {

            return 1;

        }


        return (
            Number(
                data[0].lesson_order || 0
            ) + 1
        );

    }


    /* =========================================================
       FORM SUBMIT
       ========================================================= */

    async function handleSubmit(
        event
    ) {

        event.preventDefault();


        if (
            submitting
        ) {
            return;
        }


        const validation =
            validateForm();


        if (
            !validation.valid
        ) {

            showStatus(
                validation.message,
                "error"
            );


            focusValidationField(
                validation.field
            );


            return;
        }


        if (
            !selectedModule
        ) {

            showStatus(
                "The selected module is no longer available.",
                "error"
            );


            return;
        }


        const title =
            elements.title.value.trim();


        const content =
            elements.content.value.trim();


        const order =
            Number(
                elements.order.value
            );


        if (
            editMode
        ) {

            await updateLesson(
                title,
                content,
                order
            );

        } else {

            await createLesson(
                title,
                content,
                order
            );

        }

    }


    /* =========================================================
       CREATE LESSON
       ========================================================= */

    async function createLesson(
        title,
        content,
        order
    ) {

        submitting = true;

        setFormDisabled(true);


        showStatus(
            "Creating lesson...",
            "loading"
        );


        try {

            const duplicate =
                await lessonOrderExists(
                    selectedModule.id,
                    order
                );


            if (
                duplicate
            ) {

                showStatus(
                    "This lesson order is already being used. Please choose another order.",
                    "error"
                );


                setFormDisabled(false);

                return;
            }


            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_lessons"
                    )
                    .insert({

                        module_id:
                            selectedModule.id,

                        title:
                            title,

                        content:
                            content,

                        lesson_order:
                            order,

                        is_published:
                            false

                    });


            if (
                error
            ) {

                throw error;

            }


            showStatus(
                "Lesson created successfully. Redirecting...",
                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "learning.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "NITRIXA: Lesson creation failed:",
                error
            );


            showStatus(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );


            setFormDisabled(false);

        } finally {

            submitting = false;

        }

    }


    /* =========================================================
       UPDATE LESSON
       ========================================================= */

    async function updateLesson(
        title,
        content,
        order
    ) {

        if (
            !existingLesson
        ) {

            showStatus(
                "The lesson being edited could not be loaded.",
                "error"
            );


            return;
        }


        submitting = true;

        setFormDisabled(true);


        showStatus(
            "Updating lesson...",
            "loading"
        );


        try {

            const orderChanged =
                Number(
                    existingLesson.lesson_order
                ) !==
                Number(
                    order
                );


            if (
                orderChanged
            ) {

                const duplicate =
                    await lessonOrderExists(
                        selectedModule.id,
                        order,
                        existingLesson.id
                    );


                if (
                    duplicate
                ) {

                    showStatus(
                        "This lesson order is already being used. Please choose another order.",
                        "error"
                    );


                    setFormDisabled(false);

                    return;
                }

            }


            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_lessons"
                    )
                    .update({

                        title:
                            title,

                        content:
                            content,

                        lesson_order:
                            order

                    })
                    .eq(
                        "id",
                        existingLesson.id
                    )
                    .eq(
                        "module_id",
                        selectedModule.id
                    );


            if (
                error
            ) {

                throw error;

            }


            showStatus(
                "Lesson updated successfully. Redirecting...",
                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "learning.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "NITRIXA: Lesson update failed:",
                error
            );


            showStatus(
                getSupabaseErrorMessage(
                    error
                ),
                "error"
            );


            setFormDisabled(false);

        } finally {

            submitting = false;

        }

    }


    /* =========================================================
       DUPLICATE ORDER CHECK
       ========================================================= */

    async function lessonOrderExists(
        moduleId,
        order,
        excludeLessonId
    ) {

        let query =
            supabaseClient
                .from(
                    "learning_lessons"
                )
                .select(
                    "id"
                )
                .eq(
                    "module_id",
                    moduleId
                )
                .eq(
                    "lesson_order",
                    order
                )
                .limit(
                    1
                );


        if (
            excludeLessonId
        ) {

            query =
                query.neq(
                    "id",
                    excludeLessonId
                );

        }


        const {
            data,
            error
        } =
            await query;


        if (
            error
        ) {

            throw error;

        }


        return (
            Array.isArray(data) &&
            data.length > 0
        );

    }


    /* =========================================================
       VALIDATION
       ========================================================= */

    function validateForm() {

        const title =
            elements.title.value.trim();


        const content =
            elements.content.value.trim();


        const orderValue =
            elements.order.value.trim();


        if (
            title.length < 3
        ) {

            return {

                valid:
                    false,

                field:
                    elements.title,

                message:
                    "Lesson title must contain at least 3 characters."

            };

        }


        if (
            title.length > 150
        ) {

            return {

                valid:
                    false,

                field:
                    elements.title,

                message:
                    "Lesson title cannot exceed 150 characters."

            };

        }


        if (
            content.length < 10
        ) {

            return {

                valid:
                    false,

                field:
                    elements.content,

                message:
                    "Lesson content must contain at least 10 characters."

            };

        }


        if (
            content.length > 20000
        ) {

            return {

                valid:
                    false,

                field:
                    elements.content,

                message:
                    "Lesson content cannot exceed 20,000 characters."

            };

        }


        if (
            !orderValue
        ) {

            return {

                valid:
                    false,

                field:
                    elements.order,

                message:
                    "Lesson order is required."

            };

        }


        const order =
            Number(
                orderValue
            );


        if (
            !Number.isInteger(
                order
            ) ||
            order < 1 ||
            order > 9999
        ) {

            return {

                valid:
                    false,

                field:
                    elements.order,

                message:
                    "Lesson order must be a whole number between 1 and 9999."

            };

        }


        return {

            valid:
                true

        };

    }


    function focusValidationField(
        field
    ) {

        if (
            field &&
            typeof field.focus ===
            "function"
        ) {

            field.focus();

        }

    }


    /* =========================================================
       FORM STATE
       ========================================================= */

    function setFormDisabled(
        disabled
    ) {

        if (
            elements.title
        ) {

            elements.title.disabled =
                disabled;

        }


        if (
            elements.content
        ) {

            elements.content.disabled =
                disabled;

        }


        if (
            elements.order
        ) {

            elements.order.disabled =
                disabled;

        }


        if (
            elements.submitButton
        ) {

            elements.submitButton.disabled =
                disabled;

        }

    }


    /* =========================================================
       CHARACTER COUNTERS
       ========================================================= */

    function updateCharacterCounters() {

        if (
            elements.title &&
            elements.titleCounter
        ) {

            elements.titleCounter.textContent =
                String(
                    elements.title.value.length
                );

        }


        if (
            elements.content &&
            elements.contentCounter
        ) {

            elements.contentCounter.textContent =
                String(
                    elements.content.value.length
                );

        }

    }


    /* =========================================================
       STATUS
       ========================================================= */

    function showStatus(
        message,
        type
    ) {

        if (
            !elements.status
        ) {
            return;
        }


        elements.status.textContent =
            message || "";


        elements.status.classList.remove(
            "is-loading",
            "is-success",
            "is-error",
            "is-ready"
        );


        if (
            type ===
            "loading"
        ) {

            elements.status.classList.add(
                "is-loading"
            );

        }


        if (
            type ===
            "success"
        ) {

            elements.status.classList.add(
                "is-success"
            );

        }


        if (
            type ===
            "error"
        ) {

            elements.status.classList.add(
                "is-error"
            );

        }


        if (
            type ===
            "ready"
        ) {

            elements.status.classList.add(
                "is-ready"
            );

        }

    }


    function clearFieldError() {

        if (
            elements.status &&
            elements.status.classList.contains(
                "is-error"
            )
        ) {

            elements.status.textContent =
                "";

            elements.status.classList.remove(
                "is-error"
            );

        }

    }


    function showFatalError(
        message
    ) {

        const status =
            document.getElementById(
                "learningLessonFormStatus"
            );


        if (
            status
        ) {

            status.textContent =
                message;


            status.classList.add(
                "is-error"
            );

        }

    }


    /* =========================================================
       ERROR MESSAGE
       ========================================================= */

    function getSupabaseErrorMessage(
        error
    ) {

        if (
            !error
        ) {

            return (
                "An unexpected error occurred."
            );

        }


        if (
            error.code ===
            "23505"
        ) {

            return (
                "This lesson already uses the selected order. Please choose another order."
            );

        }


        return (
            error.message ||
            error.details ||
            error.hint ||
            "An unexpected database error occurred."
        );

    }

})();