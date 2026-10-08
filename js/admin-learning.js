(function () {
    "use strict";

    /*
     * =========================================================
     * NITRIXA TECHNOLOGIES
     * ADMIN LEARNING MANAGEMENT
     * =========================================================
     *
     * Responsibilities:
     *
     * 1. Admin authentication
     * 2. Program selection
     * 3. Learning module management
     * 4. Module ordering
     * 5. Module publish / unpublish
     * 6. Module deletion
     * 7. Lesson management
     * 8. Lesson ordering
     * 9. Lesson publish / unpublish
     * 10. Lesson deletion
     *
     * Professional form flow:
     *
     * CREATE MODULE:
     * learning-module-form.html?program=PROGRAM_ID
     *
     * CREATE LESSON:
     * learning-lesson-form.html?module=MODULE_ID
     *
     * EDIT LESSON:
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

        return;
    }


    /* =========================================================
       STATE
       ========================================================= */

    let selectedProgramId =
        null;

    let selectedModuleId =
        null;

    let programs =
        [];

    let modules =
        [];

    let lessons =
        [];


    /* =========================================================
       DOM ELEMENTS
       ========================================================= */

    const elements = {

        programSelect:
            document.getElementById(
                "learningProgramSelect"
            ),

        moduleList:
            document.getElementById(
                "learningModulesList"
            ),

        lessonList:
            document.getElementById(
                "learningLessonsContainer"
            ),

        selectedProgramName:
            document.getElementById(
                "selectedProgramName"
            ),

        selectedModuleName:
            document.getElementById(
                "selectedModuleName"
            ),

        addModuleButton:
            document.getElementById(
                "addModuleButton"
            ),

        addLessonButton:
            document.getElementById(
                "addLessonButton"
            ),

        refreshButton:
            document.getElementById(
                "refreshLearningButton"
            ),

        logoutButton:
            document.getElementById(
                "learningLogoutButton"
            ),

        moduleStatus:
            document.getElementById(
                "learningStatus"
            ),

        lessonStatus:
            document.getElementById(
                "learningStatus"
            )

    };


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

        updateActionButtonState();


        const authenticated =
            await checkAdminAccess();


        if (
            !authenticated
        ) {
            return;
        }


        await loadPrograms();

    }


    /* =========================================================
       EVENT BINDINGS
       ========================================================= */

    function bindEvents() {

        if (
            elements.programSelect
        ) {

            elements.programSelect.addEventListener(
                "change",
                handleProgramChange
            );

        }


        if (
            elements.addModuleButton
        ) {

            elements.addModuleButton.addEventListener(
                "click",
                createModule
            );

        }


        if (
            elements.addLessonButton
        ) {

            elements.addLessonButton.addEventListener(
                "click",
                createLesson
            );

        }


        if (
            elements.refreshButton
        ) {

            elements.refreshButton.addEventListener(
                "click",
                refreshLearning
            );

        }


        if (
            elements.logoutButton
        ) {

            elements.logoutButton.addEventListener(
                "click",
                logout
            );

        }

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
                sessionError ||
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


                showPageError(
                    "Unable to verify administrator access."
                );


                return false;
            }


            if (
                adminData !== true
            ) {

                redirectToLogin();

                return false;
            }


            return true;


        } catch (error) {

            console.error(
                "NITRIXA: Admin access check failed:",
                error
            );


            showPageError(
                "Unable to verify administrator access."
            );


            return false;
        }

    }


    function redirectToLogin() {

        window.location.href =
            "../login.html";

    }


    /* =========================================================
       LOAD PROGRAMS
       ========================================================= */

    async function loadPrograms() {

        setModuleStatus(
            "Loading programs..."
        );


        try {

            const {
                data,
                error
            } =
                await supabaseClient
                    .from(
                        "programs"
                    )
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
                            "payment_model",
                            "created_at",
                            "updated_at"
                        ].join(",")
                    )
                    .eq(
                        "status",
                        "ACTIVE"
                    )
                    .order(
                        "name",
                        {
                            ascending:
                                true
                        }
                    );


            if (
                error
            ) {

                throw error;

            }


            programs =
                Array.isArray(
                    data
                )
                    ? data
                    : [];


            renderProgramOptions();


            if (
                programs.length ===
                0
            ) {

                selectedProgramId =
                    null;

                selectedModuleId =
                    null;

                modules =
                    [];

                lessons =
                    [];


                updateProgramHeading(
                    "No active programs"
                );


                renderEmptyModules(
                    "No active programs are available."
                );


                renderEmptyLessons(
                    "Select a program first."
                );


                updateActionButtonState();


                setModuleStatus(
                    "No active programs found."
                );


                return;
            }


            const currentProgramExists =
                programs.some(
                    function (
                        program
                    ) {

                        return (
                            program.id ===
                            selectedProgramId
                        );

                    }
                );


            if (
                !currentProgramExists
            ) {

                selectedProgramId =
                    programs[0].id;

            }


            if (
                elements.programSelect
            ) {

                elements.programSelect.value =
                    selectedProgramId ||
                    "";

            }


            updateActionButtonState();


            await loadModules();


        } catch (error) {

            console.error(
                "NITRIXA: Failed to load programs:",
                error
            );


            programs =
                [];

            modules =
                [];

            lessons =
                [];

            selectedProgramId =
                null;

            selectedModuleId =
                null;


            renderProgramOptions();


            renderEmptyModules(
                "Unable to load programs."
            );


            renderEmptyLessons(
                "Unable to load programs."
            );


            updateActionButtonState();


            setModuleStatus(
                "Unable to load programs. Check the browser console for the Supabase error."
            );

        }

    }


    /* =========================================================
       PROGRAM DROPDOWN
       ========================================================= */

    function renderProgramOptions() {

        if (
            !elements.programSelect
        ) {
            return;
        }


        elements.programSelect.innerHTML =
            "";


        const placeholder =
            document.createElement(
                "option"
            );


        placeholder.value =
            "";

        placeholder.textContent =
            "Select a program";

        placeholder.disabled =
            programs.length > 0;

        placeholder.selected =
            !selectedProgramId;


        elements.programSelect.appendChild(
            placeholder
        );


        programs.forEach(
            function (
                program
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    program.id;


                option.textContent =
                    getProgramDisplayName(
                        program
                    );


                elements.programSelect.appendChild(
                    option
                );

            }
        );


        if (
            selectedProgramId
        ) {

            elements.programSelect.value =
                selectedProgramId;

        }

    }


    function getProgramDisplayName(
        program
    ) {

        if (
            !program
        ) {
            return "Program";
        }


        return (
            program.name ||
            program.slug ||
            "Untitled Program"
        );

    }


    /* =========================================================
       PROGRAM CHANGE
       ========================================================= */

    async function handleProgramChange(
        event
    ) {

        selectedProgramId =
            event.target.value ||
            null;

        selectedModuleId =
            null;

        lessons =
            [];


        updateActionButtonState();


        if (
            !selectedProgramId
        ) {

            renderEmptyModules(
                "Select a program to view modules."
            );


            renderEmptyLessons(
                "Select a module to view lessons."
            );


            return;
        }


        await loadModules();

    }


    /* =========================================================
       LOAD MODULES
       ========================================================= */

    async function loadModules() {

        if (
            !selectedProgramId
        ) {

            modules =
                [];

            lessons =
                [];

            selectedModuleId =
                null;


            renderEmptyModules(
                "Select a program to view modules."
            );


            renderEmptyLessons(
                "Select a module to view lessons."
            );


            updateActionButtonState();


            return;
        }


        setModuleStatus(
            "Loading modules..."
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
                            "is_published",
                            "created_at",
                            "updated_at"
                        ].join(",")
                    )
                    .eq(
                        "program_id",
                        selectedProgramId
                    )
                    .order(
                        "module_order",
                        {
                            ascending:
                                true
                        }
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                true
                        }
                    );


            if (
                error
            ) {

                throw error;

            }


            modules =
                Array.isArray(
                    data
                )
                    ? data
                    : [];


            normalizeModuleOrdersLocally();


            const selectedModuleStillExists =
                modules.some(
                    function (
                        module
                    ) {

                        return (
                            module.id ===
                            selectedModuleId
                        );

                    }
                );


            if (
                !selectedModuleStillExists
            ) {

                selectedModuleId =
                    modules.length > 0
                        ? modules[0].id
                        : null;

            }


            renderModules();


            updateProgramHeading(
                getSelectedProgramName()
            );


            updateActionButtonState();


            if (
                selectedModuleId
            ) {

                await loadLessons();

            } else {

                renderEmptyLessons(
                    "Select a module to view lessons."
                );


                updateSelectedModuleHeading(
                    "No module selected"
                );


                updateActionButtonState();

            }


            setModuleStatus(
                ""
            );


        } catch (error) {

            console.error(
                "NITRIXA: Failed to load modules:",
                error
            );


            modules =
                [];

            lessons =
                [];

            selectedModuleId =
                null;


            renderEmptyModules(
                "Unable to load modules."
            );


            renderEmptyLessons(
                "Unable to load lessons."
            );


            updateActionButtonState();


            setModuleStatus(
                "Failed to load modules."
            );

        }

    }


    function normalizeModuleOrdersLocally() {

        modules.sort(
            function (
                a,
                b
            ) {

                return (
                    Number(
                        a.module_order ||
                        0
                    ) -
                    Number(
                        b.module_order ||
                        0
                    )
                );

            }
        );

    }


    /* =========================================================
       RENDER MODULES
       ========================================================= */

    function renderModules() {

        if (
            !elements.moduleList
        ) {
            return;
        }


        elements.moduleList.innerHTML =
            "";


        if (
            modules.length ===
            0
        ) {

            renderEmptyModules(
                "No modules created for this program yet."
            );


            return;
        }


        modules.forEach(
            function (
                module
            ) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "learning-admin-item";


                if (
                    module.id ===
                    selectedModuleId
                ) {

                    item.classList.add(
                        "active"
                    );

                }


                const status =
                    module.is_published
                        ? "Published"
                        : "Draft";


                item.innerHTML = `

                    <div class="learning-admin-item-main">

                        <div class="learning-admin-order">
                            ${escapeHtml(
                                module.module_order
                            )}
                        </div>

                        <div class="learning-admin-item-content">

                            <strong>
                                ${escapeHtml(
                                    module.title
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    status
                                )}
                            </span>

                        </div>

                    </div>

                    <div class="learning-admin-item-actions">

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="select"
                            data-id="${escapeAttribute(
                                module.id
                            )}"
                        >
                            Open
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="edit"
                            data-id="${escapeAttribute(
                                module.id
                            )}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="order"
                            data-id="${escapeAttribute(
                                module.id
                            )}"
                        >
                            Order
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="publish"
                            data-id="${escapeAttribute(
                                module.id
                            )}"
                        >
                            ${
                                module.is_published
                                    ? "Unpublish"
                                    : "Publish"
                            }
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn danger"
                            data-action="delete"
                            data-id="${escapeAttribute(
                                module.id
                            )}"
                        >
                            Delete
                        </button>

                    </div>

                `;


                item.addEventListener(
                    "click",
                    function (
                        event
                    ) {

                        const button =
                            event.target.closest(
                                "button"
                            );


                        if (
                            !button
                        ) {
                            return;
                        }


                        const action =
                            button.dataset.action;


                        const moduleId =
                            button.dataset.id;


                        handleModuleAction(
                            action,
                            moduleId
                        );

                    }
                );


                elements.moduleList.appendChild(
                    item
                );

            }
        );

    }


    /* =========================================================
       MODULE ACTIONS
       ========================================================= */

    async function handleModuleAction(
        action,
        moduleId
    ) {

        const module =
            modules.find(
                function (
                    item
                ) {

                    return (
                        item.id ===
                        moduleId
                    );

                }
            );


        if (
            !module
        ) {
            return;
        }


        if (
            action ===
            "select"
        ) {

            selectedModuleId =
                module.id;


            renderModules();


            updateSelectedModuleHeading(
                module.title
            );


            updateActionButtonState();


            await loadLessons();


            return;
        }


        if (
            action ===
            "edit"
        ) {

            await editModule(
                module
            );


            return;
        }


        if (
            action ===
            "order"
        ) {

            await changeModuleOrder(
                module
            );


            return;
        }


        if (
            action ===
            "publish"
        ) {

            await toggleModulePublish(
                module
            );


            return;
        }


        if (
            action ===
            "delete"
        ) {

            await deleteModule(
                module
            );

        }

    }


    /* =========================================================
       CREATE MODULE
       ========================================================= */

    function createModule() {

        if (
            !selectedProgramId
        ) {

            alert(
                "Please select a program first."
            );


            return;
        }


        const formUrl =
            new URL(
                "learning-module-form.html",
                window.location.href
            );


        formUrl.searchParams.set(
            "program",
            selectedProgramId
        );


        window.location.href =
            formUrl.href;

    }


    /* =========================================================
       EDIT MODULE
       ========================================================= */

    async function editModule(
        module
    ) {

        const title =
            window.prompt(
                "Edit module title:",
                module.title ||
                ""
            );


        if (
            title ===
            null
        ) {
            return;
        }


        const cleanTitle =
            title.trim();


        if (
            !cleanTitle
        ) {

            alert(
                "Module title is required."
            );


            return;
        }


        const description =
            window.prompt(
                "Edit module description:",
                module.description ||
                ""
            );


        if (
            description ===
            null
        ) {
            return;
        }


        const cleanDescription =
            description.trim();


        setModuleStatus(
            "Updating module..."
        );


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_modules"
                    )
                    .update({

                        title:
                            cleanTitle,

                        description:
                            cleanDescription ||
                            null

                    })
                    .eq(
                        "id",
                        module.id
                    );


            if (
                error
            ) {

                throw error;

            }


            await loadModules();


            setModuleStatus(
                "Module updated successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Module update failed:",
                error
            );


            setModuleStatus(
                "Failed to update module."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    /* =========================================================
       MODULE ORDER
       ========================================================= */

    async function changeModuleOrder(
        module
    ) {

        const currentOrder =
            Number(
                module.module_order ||
                1
            );


        const input =
            window.prompt(
                `Enter new order for "${module.title}":`,
                String(
                    currentOrder
                )
            );


        if (
            input ===
            null
        ) {
            return;
        }


        const newOrder =
            Number(
                input.trim()
            );


        if (
            !Number.isInteger(
                newOrder
            ) ||
            newOrder < 1
        ) {

            alert(
                "Order must be a whole number greater than 0."
            );


            return;
        }


        if (
            newOrder ===
            currentOrder
        ) {
            return;
        }


        setModuleStatus(
            "Updating module order..."
        );


        try {

            await reorderModule(
                module,
                newOrder
            );


            await loadModules();


            setModuleStatus(
                "Module order updated successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Module order update failed:",
                error
            );


            setModuleStatus(
                "Failed to update module order."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    async function reorderModule(
        module,
        newOrder
    ) {

        const currentOrder =
            Number(
                module.module_order ||
                1
            );


        const maxOrder =
            Math.max(
                modules.length,
                newOrder
            );


        if (
            newOrder >
            maxOrder
        ) {

            newOrder =
                maxOrder;

        }


        const affectedModules =
            modules.filter(
                function (
                    item
                ) {

                    if (
                        item.id ===
                        module.id
                    ) {

                        return false;
                    }


                    const order =
                        Number(
                            item.module_order ||
                            0
                        );


                    if (
                        newOrder <
                        currentOrder
                    ) {

                        return (
                            order >=
                            newOrder &&
                            order <
                            currentOrder
                        );

                    }


                    return (
                        order >
                        currentOrder &&
                        order <=
                        newOrder
                    );

                }
            );


        await updateModuleOrder(
            module.id,
            -currentOrder
        );


        if (
            newOrder <
            currentOrder
        ) {

            affectedModules.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        Number(
                            b.module_order
                        ) -
                        Number(
                            a.module_order
                        )
                    );

                }
            );


            for (
                const item of
                affectedModules
            ) {

                await updateModuleOrder(
                    item.id,
                    Number(
                        item.module_order
                    ) + 1
                );

            }


        } else {

            affectedModules.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        Number(
                            a.module_order
                        ) -
                        Number(
                            b.module_order
                        )
                    );

                }
            );


            for (
                const item of
                affectedModules
            ) {

                await updateModuleOrder(
                    item.id,
                    Number(
                        item.module_order
                    ) - 1
                );

            }

        }


        await updateModuleOrder(
            module.id,
            newOrder
        );

    }


    async function updateModuleOrder(
        moduleId,
        order
    ) {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "learning_modules"
                )
                .update({
                    module_order:
                        order
                })
                .eq(
                    "id",
                    moduleId
                );


        if (
            error
        ) {
            throw error;
        }

    }


    /* =========================================================
       MODULE PUBLISH / UNPUBLISH
       ========================================================= */

    async function toggleModulePublish(
        module
    ) {

        const newStatus =
            !module.is_published;


        const actionText =
            newStatus
                ? "publish"
                : "unpublish";


        const confirmed =
            window.confirm(
                `Are you sure you want to ${actionText} "${module.title}"?`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setModuleStatus(
            newStatus
                ? "Publishing module..."
                : "Unpublishing module..."
        );


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_modules"
                    )
                    .update({

                        is_published:
                            newStatus

                    })
                    .eq(
                        "id",
                        module.id
                    );


            if (
                error
            ) {

                throw error;

            }


            await loadModules();


            setModuleStatus(
                newStatus
                    ? "Module published successfully."
                    : "Module unpublished successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Module publish update failed:",
                error
            );


            setModuleStatus(
                "Failed to update module status."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    /* =========================================================
       DELETE MODULE
       ========================================================= */

    async function deleteModule(
        module
    ) {

        const confirmed =
            window.confirm(
                `Delete "${module.title}"?\n\nAll lessons inside this module will also be deleted.`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setModuleStatus(
            "Deleting module..."
        );


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_modules"
                    )
                    .delete()
                    .eq(
                        "id",
                        module.id
                    );


            if (
                error
            ) {

                throw error;

            }


            if (
                selectedModuleId ===
                module.id
            ) {

                selectedModuleId =
                    null;

                lessons =
                    [];

            }


            await loadModules();


            setModuleStatus(
                "Module deleted successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Module deletion failed:",
                error
            );


            setModuleStatus(
                "Failed to delete module."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    /* =========================================================
       LOAD LESSONS
       ========================================================= */

    async function loadLessons() {

        if (
            !selectedModuleId
        ) {

            lessons =
                [];


            renderEmptyLessons(
                "Select a module to view lessons."
            );


            updateActionButtonState();


            return;
        }


        const selectedModule =
            modules.find(
                function (
                    module
                ) {

                    return (
                        module.id ===
                        selectedModuleId
                    );

                }
            );


        if (
            !selectedModule
        ) {

            selectedModuleId =
                null;

            lessons =
                [];


            renderEmptyLessons(
                "Selected module was not found."
            );


            updateActionButtonState();


            return;
        }


        updateSelectedModuleHeading(
            selectedModule.title
        );


        setLessonStatus(
            "Loading lessons..."
        );


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
                        "module_id",
                        selectedModuleId
                    )
                    .order(
                        "lesson_order",
                        {
                            ascending:
                                true
                        }
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                true
                        }
                    );


            if (
                error
            ) {

                throw error;

            }


            lessons =
                Array.isArray(
                    data
                )
                    ? data
                    : [];


            renderLessons();


            updateActionButtonState();


            setLessonStatus(
                ""
            );


        } catch (error) {

            console.error(
                "NITRIXA: Failed to load lessons:",
                error
            );


            lessons =
                [];


            renderEmptyLessons(
                "Unable to load lessons."
            );


            updateActionButtonState();


            setLessonStatus(
                "Failed to load lessons."
            );

        }

    }


    /* =========================================================
       RENDER LESSONS
       ========================================================= */

    function renderLessons() {

        if (
            !elements.lessonList
        ) {
            return;
        }


        elements.lessonList.innerHTML =
            "";


        if (
            lessons.length ===
            0
        ) {

            renderEmptyLessons(
                "No lessons created for this module yet."
            );


            return;
        }


        lessons.forEach(
            function (
                lesson
            ) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "learning-admin-item";


                const status =
                    lesson.is_published
                        ? "Published"
                        : "Draft";


                item.innerHTML = `

                    <div class="learning-admin-item-main">

                        <div class="learning-admin-order">
                            ${escapeHtml(
                                lesson.lesson_order
                            )}
                        </div>

                        <div class="learning-admin-item-content">

                            <strong>
                                ${escapeHtml(
                                    lesson.title
                                )}
                            </strong>

                            <span>
                                ${escapeHtml(
                                    status
                                )}
                            </span>

                        </div>

                    </div>

                    <div class="learning-admin-item-actions">

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="edit"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}"
                        >
                            Edit
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="order"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}"
                        >
                            Order
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="publish"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}"
                        >
                            ${
                                lesson.is_published
                                    ? "Unpublish"
                                    : "Publish"
                            }
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn danger"
                            data-action="delete"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}"
                        >
                            Delete
                        </button>

                    </div>

                `;


                item.addEventListener(
                    "click",
                    function (
                        event
                    ) {

                        const button =
                            event.target.closest(
                                "button"
                            );


                        if (
                            !button
                        ) {
                            return;
                        }


                        const action =
                            button.dataset.action;


                        const lessonId =
                            button.dataset.id;


                        handleLessonAction(
                            action,
                            lessonId
                        );

                    }
                );


                elements.lessonList.appendChild(
                    item
                );

            }
        );

    }


    /* =========================================================
       LESSON ACTIONS
       ========================================================= */

    async function handleLessonAction(
        action,
        lessonId
    ) {

        const lesson =
            lessons.find(
                function (
                    item
                ) {

                    return (
                        item.id ===
                        lessonId
                    );

                }
            );


        if (
            !lesson
        ) {
            return;
        }


        if (
            action ===
            "edit"
        ) {

            editLesson(
                lesson
            );

            return;
        }


        if (
            action ===
            "order"
        ) {

            await changeLessonOrder(
                lesson
            );

            return;
        }


        if (
            action ===
            "publish"
        ) {

            await toggleLessonPublish(
                lesson
            );

            return;
        }


        if (
            action ===
            "delete"
        ) {

            await deleteLesson(
                lesson
            );

        }

    }


    /* =========================================================
       CREATE LESSON
       ========================================================= */

    function createLesson() {

        if (
            !selectedModuleId
        ) {

            alert(
                "Please select a module first."
            );


            return;
        }


        const formUrl =
            new URL(
                "learning-lesson-form.html",
                window.location.href
            );


        formUrl.searchParams.set(
            "module",
            selectedModuleId
        );


        window.location.href =
            formUrl.href;

    }


    /* =========================================================
       EDIT LESSON
       ========================================================= */

    function editLesson(
        lesson
    ) {

        if (
            !selectedModuleId
        ) {

            alert(
                "Please select a module first."
            );


            return;
        }


        const formUrl =
            new URL(
                "learning-lesson-form.html",
                window.location.href
            );


        formUrl.searchParams.set(
            "module",
            selectedModuleId
        );


        formUrl.searchParams.set(
            "lesson",
            lesson.id
        );


        window.location.href =
            formUrl.href;

    }


    /* =========================================================
       LESSON ORDER
       ========================================================= */

    async function changeLessonOrder(
        lesson
    ) {

        const currentOrder =
            Number(
                lesson.lesson_order ||
                1
            );


        const input =
            window.prompt(
                `Enter new order for "${lesson.title}":`,
                String(
                    currentOrder
                )
            );


        if (
            input ===
            null
        ) {
            return;
        }


        const newOrder =
            Number(
                input.trim()
            );


        if (
            !Number.isInteger(
                newOrder
            ) ||
            newOrder < 1
        ) {

            alert(
                "Order must be a whole number greater than 0."
            );


            return;
        }


        if (
            newOrder ===
            currentOrder
        ) {

            return;
        }


        setLessonStatus(
            "Updating lesson order..."
        );


        try {

            await reorderLesson(
                lesson,
                newOrder
            );


            await loadLessons();


            setLessonStatus(
                "Lesson order updated successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Lesson order update failed:",
                error
            );


            setLessonStatus(
                "Failed to update lesson order."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    async function reorderLesson(
        lesson,
        newOrder
    ) {

        const currentOrder =
            Number(
                lesson.lesson_order ||
                1
            );


        const maxOrder =
            Math.max(
                lessons.length,
                newOrder
            );


        if (
            newOrder >
            maxOrder
        ) {

            newOrder =
                maxOrder;

        }


        const affectedLessons =
            lessons.filter(
                function (
                    item
                ) {

                    if (
                        item.id ===
                        lesson.id
                    ) {

                        return false;
                    }


                    const order =
                        Number(
                            item.lesson_order ||
                            0
                        );


                    if (
                        newOrder <
                        currentOrder
                    ) {

                        return (
                            order >=
                            newOrder &&
                            order <
                            currentOrder
                        );

                    }


                    return (
                        order >
                        currentOrder &&
                        order <=
                        newOrder
                    );

                }
            );


        await updateLessonOrder(
            lesson.id,
            -currentOrder
        );


        if (
            newOrder <
            currentOrder
        ) {

            affectedLessons.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        Number(
                            b.lesson_order
                        ) -
                        Number(
                            a.lesson_order
                        )
                    );

                }
            );


            for (
                const item of
                affectedLessons
            ) {

                await updateLessonOrder(
                    item.id,
                    Number(
                        item.lesson_order
                    ) + 1
                );

            }


        } else {

            affectedLessons.sort(
                function (
                    a,
                    b
                ) {

                    return (
                        Number(
                            a.lesson_order
                        ) -
                        Number(
                            b.lesson_order
                        )
                    );

                }
            );


            for (
                const item of
                affectedLessons
            ) {

                await updateLessonOrder(
                    item.id,
                    Number(
                        item.lesson_order
                    ) - 1
                );

            }

        }


        await updateLessonOrder(
            lesson.id,
            newOrder
        );

    }


    async function updateLessonOrder(
        lessonId,
        order
    ) {

        const {
            error
        } =
            await supabaseClient
                .from(
                    "learning_lessons"
                )
                .update({

                    lesson_order:
                        order

                })
                .eq(
                    "id",
                    lessonId
                );


        if (
            error
        ) {
            throw error;
        }

    }


    /* =========================================================
       LESSON PUBLISH / UNPUBLISH
       ========================================================= */

    async function toggleLessonPublish(
        lesson
    ) {

        const newStatus =
            !lesson.is_published;


        const actionText =
            newStatus
                ? "publish"
                : "unpublish";


        const confirmed =
            window.confirm(
                `Are you sure you want to ${actionText} "${lesson.title}"?`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setLessonStatus(
            newStatus
                ? "Publishing lesson..."
                : "Unpublishing lesson..."
        );


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_lessons"
                    )
                    .update({

                        is_published:
                            newStatus

                    })
                    .eq(
                        "id",
                        lesson.id
                    );


            if (
                error
            ) {

                throw error;

            }


            await loadLessons();


            setLessonStatus(
                newStatus
                    ? "Lesson published successfully."
                    : "Lesson unpublished successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Lesson publish update failed:",
                error
            );


            setLessonStatus(
                "Failed to update lesson status."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    /* =========================================================
       DELETE LESSON
       ========================================================= */

    async function deleteLesson(
        lesson
    ) {

        const confirmed =
            window.confirm(
                `Delete "${lesson.title}"?`
            );


        if (
            !confirmed
        ) {
            return;
        }


        setLessonStatus(
            "Deleting lesson..."
        );


        try {

            const {
                error
            } =
                await supabaseClient
                    .from(
                        "learning_lessons"
                    )
                    .delete()
                    .eq(
                        "id",
                        lesson.id
                    );


            if (
                error
            ) {

                throw error;

            }


            await loadLessons();


            setLessonStatus(
                "Lesson deleted successfully."
            );


        } catch (error) {

            console.error(
                "NITRIXA: Lesson deletion failed:",
                error
            );


            setLessonStatus(
                "Failed to delete lesson."
            );


            alert(
                getSupabaseErrorMessage(
                    error
                )
            );

        }

    }


    /* =========================================================
       HEADINGS
       ========================================================= */

    function getSelectedProgramName() {

        const program =
            programs.find(
                function (
                    item
                ) {

                    return (
                        item.id ===
                        selectedProgramId
                    );

                }
            );


        return getProgramDisplayName(
            program
        );

    }


    function updateProgramHeading(
        text
    ) {

        if (
            elements.selectedProgramName
        ) {

            elements.selectedProgramName.textContent =
                text ||
                "Program";

        }

    }


    function updateSelectedModuleHeading(
        text
    ) {

        if (
            elements.selectedModuleName
        ) {

            elements.selectedModuleName.textContent =
                text ||
                "Module";

        }

    }


    /* =========================================================
       BUTTON STATES
       ========================================================= */

    function updateActionButtonState() {

        if (
            elements.addModuleButton
        ) {

            elements.addModuleButton.disabled =
                !selectedProgramId;

        }


        if (
            elements.addLessonButton
        ) {

            elements.addLessonButton.disabled =
                !selectedModuleId;

        }

    }


    /* =========================================================
       EMPTY STATES
       ========================================================= */

    function renderEmptyModules(
        message
    ) {

        if (
            !elements.moduleList
        ) {
            return;
        }


        elements.moduleList.innerHTML = `

            <div class="learning-empty">

                <strong>
                    ${escapeHtml(
                        message
                    )}
                </strong>

            </div>

        `;


        setModuleStatus(
            ""
        );

    }


    function renderEmptyLessons(
        message
    ) {

        if (
            !elements.lessonList
        ) {
            return;
        }


        elements.lessonList.innerHTML = `

            <div class="learning-empty">

                <strong>
                    ${escapeHtml(
                        message
                    )}
                </strong>

            </div>

        `;


        setLessonStatus(
            ""
        );

    }


    /* =========================================================
       STATUS
       ========================================================= */

    function setModuleStatus(
        message
    ) {

        if (
            elements.moduleStatus
        ) {

            elements.moduleStatus.textContent =
                message ||
                "";

        }

    }


    function setLessonStatus(
        message
    ) {

        if (
            elements.lessonStatus
        ) {

            elements.lessonStatus.textContent =
                message ||
                "";

        }

    }


    function showPageError(
        message
    ) {

        setModuleStatus(
            message
        );


        setLessonStatus(
            message
        );

    }


    /* =========================================================
       REFRESH
       ========================================================= */

    async function refreshLearning() {

        setModuleStatus(
            "Refreshing..."
        );


        await loadPrograms();


        setModuleStatus(
            "Learning data refreshed."
        );

    }


    /* =========================================================
       LOGOUT
       ========================================================= */

    async function logout() {

        try {

            const {
                error
            } =
                await supabaseClient.auth.signOut();


            if (
                error
            ) {

                throw error;

            }


            window.location.href =
                "../login.html";


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


    /* =========================================================
       SECURITY / OUTPUT HELPERS
       ========================================================= */

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
                "This record already exists or conflicts with an existing order."
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