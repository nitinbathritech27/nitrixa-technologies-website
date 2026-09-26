/* =========================================================
   NITRIXA TECHNOLOGIES
   Supabase Client Configuration
   ========================================================= */

const SUPABASE_URL = "https://marxrvahcdmkdvmmweqh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OjoDFOU1_lSXpB30-aw5Ew_ukV49Eci";

let supabaseClient = null;

if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.startsWith("YOUR_") &&
    !SUPABASE_ANON_KEY.startsWith("YOUR_")
) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
} else {
    console.error(
        "NITRIXA: Supabase could not be initialized. Check the Supabase CDN, Project URL, and Publishable/Anon Key."
    );
}