/* =========================================================
   NITRIXA TECHNOLOGIES
   SUPABASE CLIENT CONFIGURATION
   ========================================================= */

(function () {

    "use strict";

    const SUPABASE_URL =
        "https://marxrvahcdmkdvmmweqh.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_OjoDFOU1_lSXpB30-aw5Ew_ukV49Eci";


    window.supabaseClient = null;


    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "NITRIXA: Supabase CDN was not loaded before supabase.js."
        );

        return;
    }


    if (
        !SUPABASE_URL ||
        !SUPABASE_PUBLISHABLE_KEY
    ) {

        console.error(
            "NITRIXA: Supabase URL or Publishable Key is missing."
        );

        return;
    }


    try {

        window.supabaseClient =
            window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: true
                    }
                }
            );


        console.log(
            "NITRIXA: Supabase client initialized successfully."
        );


    } catch (error) {

        console.error(
            "NITRIXA: Supabase client initialization failed:",
            error
        );

        window.supabaseClient = null;
    }

})();