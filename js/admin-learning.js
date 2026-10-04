(function () {
    "use strict";

    /*
     * NITRIXA TECHNOLOGIES
     * Admin Learning Management
     *
     * Handles:
     * - Admin authentication
     * - Program selection
     * - Learning module CRUD
     * - Module publish/unpublish
     * - Module ordering
     * - Learning lesson CRUD
     * - Lesson publish/unpublish
     * - Lesson ordering
     */

    const supabaseClient = window.supabaseClient;

    if (!supabaseClient) {
        console.error(
            "NITRIXA: Supabase client is not available."
        );
        return;
    }

    let selectedProgramId = null;
    let selectedModuleId = null;

    let programs = [];
    let modules = [];
    let lessons = [];

    const elements = {
        programSelect:
            document.getElementById("programSelect"),

        moduleList:
            document.getElementById("moduleList"),

        lessonList:
            document.getElementById("lessonList"),

        selectedProgramName:
            document.getElementById("selectedProgramName"),

        selectedModuleName:
            document.getElementById("selectedModuleName"),

        addModuleButton:
            document.getElementById("addModuleButton"),

        addLessonButton:
            document.getElementById("addLessonButton"),

        refreshButton:
            document.getElementById("refreshButton"),

        logoutButton:
            document.getElementById("logoutButton"),

        moduleStatus:
            document.getElementById("moduleStatus"),

        lessonStatus:
            document.getElementById("lessonStatus")
    };

    document.addEventListener(
        "DOMContentLoaded",
        initialize
    );

    async function initialize() {
        bindEvents();

        const authenticated =
            await checkAdminAccess();

        if (!authenticated) {
            return;
        }

        await loadPrograms();
    }

    function bindEvents() {
        if (elements.programSelect) {
            elements.programSelect.addEventListener(
                "change",
                handleProgramChange
            );
        }

        if (elements.addModuleButton) {
            elements.addModuleButton.addEventListener(
                "click",
                createModule
            );
        }

        if (elements.addLessonButton) {
            elements.addLessonButton.addEventListener(
                "click",
                createLesson
            );
        }

        if (elements.refreshButton) {
            elements.refreshButton.addEventListener(
                "click",
                refreshLearning
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
     * ---------------------------------------------------------
     * ADMIN ACCESS
     * ---------------------------------------------------------
     */

    async function checkAdminAccess() {
        try {
            const {
                data: sessionData,
                error: sessionError
            } = await supabaseClient.auth.getSession();

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
            } = await supabaseClient.rpc(
                "is_admin"
            );

            if (adminError) {
                console.error(
                    "NITRIXA: Admin verification failed:",
                    adminError
                );

                showPageError(
                    "Unable to verify administrator access."
                );

                return false;
            }

            if (adminData !== true) {
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
        window.location.href = "../login.html";
    }

    /*
     * ---------------------------------------------------------
     * PROGRAMS
     * ---------------------------------------------------------
     */

    async function loadPrograms() {
        setModuleStatus(
            "Loading programs..."
        );

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("programs")
                .select(
                    "id, name, title, type, status"
                )
                .eq(
                    "status",
                    "ACTIVE"
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );

            if (error) {
                throw error;
            }

            programs = data || [];

            renderProgramOptions();

            if (programs.length === 0) {
                selectedProgramId = null;
                selectedModuleId = null;

                updateProgramHeading(
                    "No active programs"
                );

                renderEmptyModules(
                    "No active programs are available."
                );

                renderEmptyLessons(
                    "Select a program first."
                );

                return;
            }

            const currentProgramExists =
                programs.some(
                    function (program) {
                        return (
                            program.id ===
                            selectedProgramId
                        );
                    }
                );

            if (!currentProgramExists) {
                selectedProgramId =
                    programs[0].id;
            }

            if (elements.programSelect) {
                elements.programSelect.value =
                    selectedProgramId;
            }

            await loadModules();

        } catch (error) {
            console.error(
                "NITRIXA: Failed to load programs:",
                error
            );

            showPageError(
                "Unable to load programs."
            );
        }
    }

    function renderProgramOptions() {
        if (!elements.programSelect) {
            return;
        }

        elements.programSelect.innerHTML = "";

        programs.forEach(
            function (program) {
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
    }

    function getProgramDisplayName(
        program
    ) {
        if (!program) {
            return "Program";
        }

        return (
            program.name ||
            program.title ||
            "Untitled Program"
        );
    }

    async function handleProgramChange(
        event
    ) {
        selectedProgramId =
            event.target.value || null;

        selectedModuleId = null;

        await loadModules();
    }

    /*
     * ---------------------------------------------------------
     * MODULES
     * ---------------------------------------------------------
     */

    async function loadModules() {
        if (!selectedProgramId) {
            renderEmptyModules(
                "Select a program to view modules."
            );

            renderEmptyLessons(
                "Select a module to view lessons."
            );

            return;
        }

        setModuleStatus(
            "Loading modules..."
        );

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("learning_modules")
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
                    ].join(", ")
                )
                .eq(
                    "program_id",
                    selectedProgramId
                )
                .order(
                    "module_order",
                    {
                        ascending: true
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

            if (error) {
                throw error;
            }

            modules = data || [];

            normalizeModuleOrdersLocally();

            const selectedModuleStillExists =
                modules.some(
                    function (module) {
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

            if (selectedModuleId) {
                await loadLessons();
            } else {
                renderEmptyLessons(
                    "Select a module to view lessons."
                );

                updateSelectedModuleHeading(
                    "No module selected"
                );
            }

        } catch (error) {
            console.error(
                "NITRIXA: Failed to load modules:",
                error
            );

            renderEmptyModules(
                "Unable to load modules."
            );

            renderEmptyLessons(
                "Unable to load lessons."
            );

            setModuleStatus(
                "Failed to load modules."
            );
        }
    }

    function normalizeModuleOrdersLocally() {
        modules.sort(
            function (a, b) {
                return (
                    Number(
                        a.module_order || 0
                    ) -
                    Number(
                        b.module_order || 0
                    )
                );
            }
        );
    }

    function renderModules() {
        if (!elements.moduleList) {
            return;
        }

        elements.moduleList.innerHTML = "";

        if (modules.length === 0) {
            renderEmptyModules(
                "No modules created for this program yet."
            );
            return;
        }

        modules.forEach(
            function (module) {
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
                            )}">
                            Open
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="edit"
                            data-id="${escapeAttribute(
                                module.id
                            )}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="order"
                            data-id="${escapeAttribute(
                                module.id
                            )}">
                            Order
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="publish"
                            data-id="${escapeAttribute(
                                module.id
                            )}">
                            ${module.is_published
                                ? "Unpublish"
                                : "Publish"}
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn danger"
                            data-action="delete"
                            data-id="${escapeAttribute(
                                module.id
                            )}">
                            Delete
                        </button>
                    </div>
                </div>
            `;

                item.addEventListener(
                    "click",
                    function (event) {
                        const button =
                            event.target.closest(
                                "button"
                            );

                        if (!button) {
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

    async function handleModuleAction(
        action,
        moduleId
    ) {
        const module =
            modules.find(
                function (item) {
                    return (
                        item.id ===
                        moduleId
                    );
                }
            );

        if (!module) {
            return;
        }

        if (action === "select") {
            selectedModuleId =
                module.id;

            renderModules();

            await loadLessons();

            return;
        }

        if (action === "edit") {
            await editModule(module);
            return;
        }

        if (action === "order") {
            await changeModuleOrder(module);
            return;
        }

        if (action === "publish") {
            await toggleModulePublish(module);
            return;
        }

        if (action === "delete") {
            await deleteModule(module);
        }
    }

    async function createModule() {
        if (!selectedProgramId) {
            alert(
                "Please select a program first."
            );
            return;
        }

        const title =
            window.prompt(
                "Enter module title:"
            );

        if (title === null) {
            return;
        }

        const cleanTitle =
            title.trim();

        if (!cleanTitle) {
            alert(
                "Module title is required."
            );
            return;
        }

        const description =
            window.prompt(
                "Enter module description (optional):"
            );

        if (description === null) {
            return;
        }

        const cleanDescription =
            description.trim();

        const nextOrder =
            getNextModuleOrder();

        setModuleStatus(
            "Creating module..."
        );

        try {
            const {
                data,
                error
            } = await supabaseClient
                .from("learning_modules")
                .insert({
                    program_id:
                        selectedProgramId,

                    title:
                        cleanTitle,

                    description:
                        cleanDescription ||
                        null,

                    module_order:
                        nextOrder,

                    is_published:
                        false
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            selectedModuleId =
                data.id;

            await loadModules();

            setModuleStatus(
                "Module created successfully."
            );

        } catch (error) {
            console.error(
                "NITRIXA: Module creation failed:",
                error
            );

            setModuleStatus(
                "Failed to create module."
            );

            alert(
                getSupabaseErrorMessage(
                    error
                )
            );
        }
    }

    async function editModule(module) {
        const title =
            window.prompt(
                "Edit module title:",
                module.title || ""
            );

        if (title === null) {
            return;
        }

        const cleanTitle =
            title.trim();

        if (!cleanTitle) {
            alert(
                "Module title is required."
            );
            return;
        }

        const description =
            window.prompt(
                "Edit module description:",
                module.description || ""
            );

        if (description === null) {
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
            } = await supabaseClient
                .from("learning_modules")
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

            if (error) {
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

    async function changeModuleOrder(
        module
    ) {
        const currentOrder =
            Number(
                module.module_order || 1
            );

        const input =
            window.prompt(
                `Enter new order for "${module.title}":`,
                String(currentOrder)
            );

        if (input === null) {
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
                module.module_order || 1
            );

        const maxOrder =
            Math.max(
                modules.length,
                newOrder
            );

        if (
            newOrder > maxOrder
        ) {
            newOrder =
                maxOrder;
        }

        const affectedModules =
            modules.filter(
                function (item) {
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
                            order >= newOrder &&
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

        /*
         * Temporary negative order prevents
         * collisions while shifting records.
         */
        await updateModuleOrder(
            module.id,
            -currentOrder
        );

        if (
            newOrder <
            currentOrder
        ) {
            affectedModules.sort(
                function (a, b) {
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
                const item of affectedModules
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
                function (a, b) {
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
                const item of affectedModules
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
        } = await supabaseClient
            .from("learning_modules")
            .update({
                module_order:
                    order
            })
            .eq(
                "id",
                moduleId
            );

        if (error) {
            throw error;
        }
    }

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

        if (!confirmed) {
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
            } = await supabaseClient
                .from("learning_modules")
                .update({
                    is_published:
                        newStatus
                })
                .eq(
                    "id",
                    module.id
                );

            if (error) {
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

    async function deleteModule(
        module
    ) {
        const confirmed =
            window.confirm(
                `Delete "${module.title}"?\n\nAll lessons inside this module will also be deleted.`
            );

        if (!confirmed) {
            return;
        }

        setModuleStatus(
            "Deleting module..."
        );

        try {
            const {
                error
            } = await supabaseClient
                .from("learning_modules")
                .delete()
                .eq(
                    "id",
                    module.id
                );

            if (error) {
                throw error;
            }

            selectedModuleId =
                null;

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

    function getNextModuleOrder() {
        if (
            modules.length ===
            0
        ) {
            return 1;
        }

        return (
            Math.max(
                ...modules.map(
                    function (module) {
                        return Number(
                            module.module_order ||
                            0
                        );
                    }
                )
            ) + 1
        );
    }

    /*
     * ---------------------------------------------------------
     * LESSONS
     * ---------------------------------------------------------
     */

    async function loadLessons() {
        if (!selectedModuleId) {
            renderEmptyLessons(
                "Select a module to view lessons."
            );

            updateSelectedModuleHeading(
                "No module selected"
            );

            return;
        }

        const selectedModule =
            modules.find(
                function (module) {
                    return (
                        module.id ===
                        selectedModuleId
                    );
                }
            );

        if (!selectedModule) {
            renderEmptyLessons(
                "Selected module was not found."
            );

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
            } = await supabaseClient
                .from("learning_lessons")
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
                    ].join(", ")
                )
                .eq(
                    "module_id",
                    selectedModuleId
                )
                .order(
                    "lesson_order",
                    {
                        ascending: true
                    }
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );

            if (error) {
                throw error;
            }

            lessons = data || [];

            renderLessons();

        } catch (error) {
            console.error(
                "NITRIXA: Failed to load lessons:",
                error
            );

            lessons = [];

            renderEmptyLessons(
                "Unable to load lessons."
            );

            setLessonStatus(
                "Failed to load lessons."
            );
        }
    }

    function renderLessons() {
        if (!elements.lessonList) {
            return;
        }

        elements.lessonList.innerHTML = "";

        if (lessons.length === 0) {
            renderEmptyLessons(
                "No lessons created for this module yet."
            );
            return;
        }

        lessons.forEach(
            function (lesson) {
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
                            )}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="order"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}">
                            Order
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn"
                            data-action="publish"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}">
                            ${lesson.is_published
                                ? "Unpublish"
                                : "Publish"}
                        </button>

                        <button
                            type="button"
                            class="learning-action-btn danger"
                            data-action="delete"
                            data-id="${escapeAttribute(
                                lesson.id
                            )}">
                            Delete
                        </button>
                    </div>
                `;

                item.addEventListener(
                    "click",
                    function (event) {
                        const button =
                            event.target.closest(
                                "button"
                            );

                        if (!button) {
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

    async function handleLessonAction(
        action,
        lessonId
    ) {
        const lesson =
            lessons.find(
                function (item) {
                    return (
                        item.id ===
                        lessonId
                    );
                }
            );

        if (!lesson) {
            return;
        }

        if (action === "edit") {
            await editLesson(lesson);
            return;
        }

        if (action === "order") {
            await changeLessonOrder(lesson);
            return;
        }

        if (action === "publish") {
            await toggleLessonPublish(lesson);
            return;
        }

        if (action === "delete") {
            await deleteLesson(lesson);
        }
    }

    async function createLesson() {
        if (!selectedModuleId) {
            alert(
                "Please select a module first."
            );
            return;
        }

        const title =
            window.prompt(
                "Enter lesson title:"
            );

        if (title === null) {
            return;
        }

        const cleanTitle =
            title.trim();

        if (!cleanTitle) {
            alert(
                "Lesson title is required."
            );
            return;
        }

        const content =
            window.prompt(
                "Enter lesson content:"
            );

        if (content === null) {
            return;
        }

        const cleanContent =
            content.trim();

        if (!cleanContent) {
            alert(
                "Lesson content is required."
            );
            return;
        }

        const nextOrder =
            getNextLessonOrder();

        setLessonStatus(
            "Creating lesson..."
        );

        try {
            const {
                error
            } = await supabaseClient
                .from("learning_lessons")
                .insert({
                    module_id:
                        selectedModuleId,

                    title:
                        cleanTitle,

                    content:
                        cleanContent,

                    lesson_order:
                        nextOrder,

                    is_published:
                        false
                });

            if (error) {
                throw error;
            }

            await loadLessons();

            setLessonStatus(
                "Lesson created successfully."
            );

        } catch (error) {
            console.error(
                "NITRIXA: Lesson creation failed:",
                error
            );

            setLessonStatus(
                "Failed to create lesson."
            );

            alert(
                getSupabaseErrorMessage(
                    error
                )
            );
        }
    }

    async function editLesson(lesson) {
        const title =
            window.prompt(
                "Edit lesson title:",
                lesson.title || ""
            );

        if (title === null) {
            return;
        }

        const cleanTitle =
            title.trim();

        if (!cleanTitle) {
            alert(
                "Lesson title is required."
            );
            return;
        }

        const content =
            window.prompt(
                "Edit lesson content:",
                lesson.content || ""
            );

        if (content === null) {
            return;
        }

        const cleanContent =
            content.trim();

        if (!cleanContent) {
            alert(
                "Lesson content is required."
            );
            return;
        }

        setLessonStatus(
            "Updating lesson..."
        );

        try {
            const {
                error
            } = await supabaseClient
                .from("learning_lessons")
                .update({
                    title:
                        cleanTitle,

                    content:
                        cleanContent
                })
                .eq(
                    "id",
                    lesson.id
                );

            if (error) {
                throw error;
            }

            await loadLessons();

            setLessonStatus(
                "Lesson updated successfully."
            );

        } catch (error) {
            console.error(
                "NITRIXA: Lesson update failed:",
                error
            );

            setLessonStatus(
                "Failed to update lesson."
            );

            alert(
                getSupabaseErrorMessage(
                    error
                )
            );
        }
    }

    async function changeLessonOrder(
        lesson
    ) {
        const currentOrder =
            Number(
                lesson.lesson_order || 1
            );

        const input =
            window.prompt(
                `Enter new order for "${lesson.title}":`,
                String(currentOrder)
            );

        if (input === null) {
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
                lesson.lesson_order || 1
            );

        const maxOrder =
            Math.max(
                lessons.length,
                newOrder
            );

        if (
            newOrder > maxOrder
        ) {
            newOrder =
                maxOrder;
        }

        const affectedLessons =
            lessons.filter(
                function (item) {
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
                            order >= newOrder &&
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

        /*
         * Temporary negative order prevents
         * collisions while shifting records.
         */
        await updateLessonOrder(
            lesson.id,
            -currentOrder
        );

        if (
            newOrder <
            currentOrder
        ) {
            affectedLessons.sort(
                function (a, b) {
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
                const item of affectedLessons
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
                function (a, b) {
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
                const item of affectedLessons
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
        } = await supabaseClient
            .from("learning_lessons")
            .update({
                lesson_order:
                    order
            })
            .eq(
                "id",
                lessonId
            );

        if (error) {
            throw error;
        }
    }

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

        if (!confirmed) {
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
            } = await supabaseClient
                .from("learning_lessons")
                .update({
                    is_published:
                        newStatus
                })
                .eq(
                    "id",
                    lesson.id
                );

            if (error) {
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

    async function deleteLesson(
        lesson
    ) {
        const confirmed =
            window.confirm(
                `Delete "${lesson.title}"?`
            );

        if (!confirmed) {
            return;
        }

        setLessonStatus(
            "Deleting lesson..."
        );

        try {
            const {
                error
            } = await supabaseClient
                .from("learning_lessons")
                .delete()
                .eq(
                    "id",
                    lesson.id
                );

            if (error) {
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

    function getNextLessonOrder() {
        if (
            lessons.length ===
            0
        ) {
            return 1;
        }

        return (
            Math.max(
                ...lessons.map(
                    function (lesson) {
                        return Number(
                            lesson.lesson_order ||
                            0
                        );
                    }
                )
            ) + 1
        );
    }

    /*
     * ---------------------------------------------------------
     * UI HELPERS
     * ---------------------------------------------------------
     */

    function getSelectedProgramName() {
        const program =
            programs.find(
                function (item) {
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
                text || "Program";
        }
    }

    function updateSelectedModuleHeading(
        text
    ) {
        if (
            elements.selectedModuleName
        ) {
            elements.selectedModuleName.textContent =
                text || "Module";
        }
    }

    function renderEmptyModules(
        message
    ) {
        if (!elements.moduleList) {
            return;
        }

        elements.moduleList.innerHTML = `
            <div class="learning-empty-state">
                ${escapeHtml(message)}
            </div>
        `;

        setModuleStatus("");
    }

    function renderEmptyLessons(
        message
    ) {
        if (!elements.lessonList) {
            return;
        }

        elements.lessonList.innerHTML = `
            <div class="learning-empty-state">
                ${escapeHtml(message)}
            </div>
        `;

        setLessonStatus("");
    }

    function setModuleStatus(
        message
    ) {
        if (
            elements.moduleStatus
        ) {
            elements.moduleStatus.textContent =
                message || "";
        }
    }

    function setLessonStatus(
        message
    ) {
        if (
            elements.lessonStatus
        ) {
            elements.lessonStatus.textContent =
                message || "";
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

    async function refreshLearning() {
        setModuleStatus(
            "Refreshing..."
        );

        await loadPrograms();

        setModuleStatus(
            "Learning data refreshed."
        );
    }

    async function logout() {
        try {
            const {
                error
            } = await supabaseClient.auth.signOut();

            if (error) {
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

    /*
     * ---------------------------------------------------------
     * SECURITY / OUTPUT HELPERS
     * ---------------------------------------------------------
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

    function getSupabaseErrorMessage(
        error
    ) {
        if (!error) {
            return "An unexpected error occurred.";
        }

        return (
            error.message ||
            error.details ||
            error.hint ||
            "An unexpected database error occurred."
        );
    }
})();