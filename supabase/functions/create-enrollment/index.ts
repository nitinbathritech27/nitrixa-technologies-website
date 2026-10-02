/* =========================================================
   NITRIXA TECHNOLOGIES
   CREATE ENROLLMENT EDGE FUNCTION

   FLOW:

   Authenticated User
        ↓
   Validate Program
        ↓
   Validate Enrollment Path
        ↓
   Read Trusted Program Fee
        ↓
   Check Existing Enrollment
        ↓
   Create PENDING_PAYMENT Enrollment
        ↓
   Return Enrollment ID

   IMPORTANT SECURITY RULES:

   - User ID comes from verified Supabase JWT.
   - Program fee is NEVER trusted from browser.
   - Amount is read from public.programs.
   - Program must be ACTIVE.
   - Enrollment path must match program type.
   - Duplicate active/pending enrollments are prevented.
   - Payment is NOT processed here.
   ========================================================= */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


/* =========================================================
   ENVIRONMENT
   ========================================================= */

const SUPABASE_URL =
    Deno.env.get("SUPABASE_URL") ?? "";

const SUPABASE_ANON_KEY =
    Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";


/* =========================================================
   BASIC VALIDATION
   ========================================================= */

if (!SUPABASE_URL) {

    console.error(
        "NITRIXA: SUPABASE_URL is missing."
    );

}


if (!SUPABASE_ANON_KEY) {

    console.error(
        "NITRIXA: SUPABASE_ANON_KEY is missing."
    );

}


if (!SUPABASE_SERVICE_ROLE_KEY) {

    console.error(
        "NITRIXA: SUPABASE_SERVICE_ROLE_KEY is missing."
    );

}


/* =========================================================
   CORS
   ========================================================= */

const corsHeaders = {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
        "POST, OPTIONS"

};


/* =========================================================
   RESPONSE HELPERS
   ========================================================= */

function jsonResponse(
    body: Record<string, unknown>,
    status = 200
) {

    return new Response(

        JSON.stringify(body),

        {

            status,

            headers: {

                ...corsHeaders,

                "Content-Type":
                    "application/json"

            }

        }

    );

}


/* =========================================================
   NORMALIZE STRING
   ========================================================= */

function normalizeString(
    value: unknown
): string {

    return String(
        value ?? ""
    )
        .trim();

}


/* =========================================================
   NORMALIZE LOWERCASE
   ========================================================= */

function normalizeLowercase(
    value: unknown
): string {

    return normalizeString(
        value
    ).toLowerCase();

}


/* =========================================================
   NORMALIZE UPPERCASE
   ========================================================= */

function normalizeUppercase(
    value: unknown
): string {

    return normalizeString(
        value
    ).toUpperCase();

}


/* =========================================================
   VALID ENROLLMENT PATHS
   ========================================================= */

const VALID_ENROLLMENT_PATHS = new Set([

    "internship",

    "training-internship"

]);


/* =========================================================
   VALID ENROLLMENT STATUSES
   ========================================================= */

const ACTIVE_OR_PENDING_STATUSES = [

    "PENDING_PAYMENT",

    "PAYMENT_VERIFIED",

    "ACTIVE"

];


/* =========================================================
   MAIN HANDLER
   ========================================================= */

Deno.serve(
    async function (request: Request) {

        /* =================================================
           CORS PREFLIGHT
           ================================================= */

        if (
            request.method ===
            "OPTIONS"
        ) {

            return new Response(
                "ok",
                {
                    status: 200,
                    headers: corsHeaders
                }
            );

        }


        /* =================================================
           METHOD
           ================================================= */

        if (
            request.method !==
            "POST"
        ) {

            return jsonResponse(

                {
                    success: false,

                    message:
                        "Only POST requests are allowed."

                },

                405

            );

        }


        try {

            /* =============================================
               SUPABASE CLIENT
               ============================================= */

            if (
                !SUPABASE_URL ||
                !SUPABASE_ANON_KEY ||
                !SUPABASE_SERVICE_ROLE_KEY
            ) {

                console.error(
                    "NITRIXA: Required Supabase environment variables are missing."
                );


                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Server configuration is incomplete."

                    },

                    500

                );

            }


            /* =============================================
               AUTH CLIENT
               ============================================= */

            const authClient =
                createClient(

                    SUPABASE_URL,

                    SUPABASE_ANON_KEY,

                    {

                        auth: {

                            persistSession:
                                false,

                            autoRefreshToken:
                                false

                        }

                    }

                );


            /* =============================================
               SERVICE CLIENT
               ============================================= */

            const adminClient =
                createClient(

                    SUPABASE_URL,

                    SUPABASE_SERVICE_ROLE_KEY,

                    {

                        auth: {

                            persistSession:
                                false,

                            autoRefreshToken:
                                false

                        }

                    }

                );


            /* =============================================
               AUTHORIZATION HEADER
               ============================================= */

            const authorization =
                request.headers.get(
                    "Authorization"
                );


            if (
                !authorization
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Authentication is required."

                    },

                    401

                );

            }


            if (
                !authorization
                    .toLowerCase()
                    .startsWith(
                        "bearer "
                    )
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Invalid authorization format."

                    },

                    401

                );

            }


            const accessToken =
                authorization
                    .replace(
                        /^Bearer\s+/i,
                        ""
                    )
                    .trim();


            if (
                !accessToken
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Authentication token is missing."

                    },

                    401

                );

            }


            /* =============================================
               VERIFY AUTHENTICATED USER
               ============================================= */

            const {
                data: userData,
                error: userError
            } =
                await authClient.auth
                    .getUser(
                        accessToken
                    );


            if (
                userError ||
                !userData ||
                !userData.user
            ) {

                console.error(
                    "NITRIXA: User authentication failed:",
                    userError
                );


                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Your login session is invalid or expired."

                    },

                    401

                );

            }


            const currentUser =
                userData.user;


            const userId =
                currentUser.id;


            /* =============================================
               READ REQUEST BODY
               ============================================= */

            let body: Record<
                string,
                unknown
            > = {};


            try {

                body =
                    await request.json();

            } catch {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Invalid request body."

                    },

                    400

                );

            }


            /* =============================================
               PROGRAM IDENTIFIER
               ============================================= */

            const programId =
                normalizeString(
                    body.programId
                );


            const programSlug =
                normalizeLowercase(
                    body.programSlug
                );


            /*
             * We support both ID and slug so the frontend
             * can use whichever it already has.
             *
             * The server still resolves the actual program
             * from Supabase.
             */

            if (
                !programId &&
                !programSlug
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Program information is required."

                    },

                    400

                );

            }


            /* =============================================
               ENROLLMENT PATH
               ============================================= */

            const enrollmentPath =
                normalizeLowercase(
                    body.enrollmentPath ||
                    body.path
                );


            if (
                !VALID_ENROLLMENT_PATHS.has(
                    enrollmentPath
                )
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Invalid enrollment path."

                    },

                    400

                );

            }


            /* =============================================
               LOAD PROGRAM
               ============================================= */

            let programQuery =
                adminClient
                    .from("programs")
                    .select(`
                        id,
                        name,
                        slug,
                        program_type,
                        duration,
                        training_duration,
                        internship_duration,
                        payment_model,
                        fee,
                        status
                    `);


            if (
                programId
            ) {

                programQuery =
                    programQuery.eq(
                        "id",
                        programId
                    );

            } else {

                programQuery =
                    programQuery.eq(
                        "slug",
                        programSlug
                    );

            }


            const {
                data: program,
                error: programError
            } =
                await programQuery
                    .eq(
                        "status",
                        "ACTIVE"
                    )
                    .maybeSingle();


            if (
                programError
            ) {

                console.error(
                    "NITRIXA: Program lookup failed:",
                    programError
                );


                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Unable to verify the selected program."

                    },

                    500

                );

            }


            if (
                !program
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "The selected program is not available."

                    },

                    404

                );

            }


            /* =============================================
               PROGRAM TYPE
               ============================================= */

            const programType =
                normalizeUppercase(
                    program.program_type
                );


            /* =============================================
               VALIDATE PATH AGAINST PROGRAM TYPE
               ============================================= */

            if (
                enrollmentPath ===
                    "internship" &&
                programType !==
                    "INTERNSHIP"
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "This program does not support Internship Only enrollment."

                    },

                    400

                );

            }


            if (
                enrollmentPath ===
                    "training-internship" &&
                programType !==
                    "TRAINING_AND_INTERNSHIP"
            ) {

                return jsonResponse(

                    {
                        success: false,

                        message:
                            "This program does not support Training + Internship enrollment."

                    },

                    400

                );

            }


            /* =============================================
               VALIDATE PROGRAM FEE
               ============================================= */

            const programFee =
                Number(
                    program.fee
                );


            if (
                !Number.isFinite(
                    programFee
                ) ||
                programFee <= 0
            ) {

                console.error(
                    "NITRIXA: Invalid program fee:",
                    program.fee
                );


                return jsonResponse(

                    {
                        success: false,

                        message:
                            "This program does not currently have a valid enrollment fee."

                    },

                    400

                );

            }


            /* =============================================
               CHECK EXISTING ENROLLMENTS
               ============================================= */

            const {
                data: existingEnrollments,
                error: existingError
            } =
                await adminClient

                    .from("enrollments")

                    .select(`
                        id,
                        enrollment_path,
                        status,
                        amount,
                        created_at
                    `)

                    .eq(
                        "user_id",
                        userId
                    )

                    .eq(
                        "program_id",
                        program.id
                    )

                    .eq(
                        "enrollment_path",
                        enrollmentPath
                    )

                    .in(
                        "status",
                        ACTIVE_OR_PENDING_STATUSES
                    )

                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )

                    .limit(1);


            if (
                existingError
            ) {

                console.error(
                    "NITRIXA: Existing enrollment check failed:",
                    existingError
                );


                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Unable to verify existing enrollment."

                    },

                    500

                );

            }


            if (
                existingEnrollments &&
                existingEnrollments.length > 0
            ) {

                const existing =
                    existingEnrollments[0];


                const existingStatus =
                    normalizeUppercase(
                        existing.status
                    );


                /*
                 * Already ACTIVE / PAYMENT_VERIFIED
                 */

                if (
                    existingStatus ===
                        "ACTIVE" ||
                    existingStatus ===
                        "PAYMENT_VERIFIED"
                ) {

                    return jsonResponse(

                        {
                            success: false,

                            code:
                                "ALREADY_ENROLLED",

                            message:
                                "You are already enrolled in this program.",

                            enrollmentId:
                                existing.id,

                            enrollmentStatus:
                                existing.status

                        },

                        409

                    );

                }


                /*
                 * Existing pending payment.
                 *
                 * Reuse it instead of creating
                 * multiple payment records.
                 */

                if (
                    existingStatus ===
                    "PENDING_PAYMENT"
                ) {

                    return jsonResponse(

                        {
                            success: true,

                            reused:
                                true,

                            message:
                                "An existing pending enrollment was found.",

                            enrollmentId:
                                existing.id,

                            enrollmentStatus:
                                existing.status,

                            enrollmentPath:
                                existing.enrollment_path,

                            amount:
                                Number(
                                    existing.amount
                                ),

                            program: {

                                id:
                                    program.id,

                                name:
                                    program.name,

                                slug:
                                    program.slug

                            }

                        },

                        200

                    );

                }

            }


            /* =============================================
               CREATE PENDING ENROLLMENT
               ============================================= */

            const enrollmentPayload = {

                user_id:
                    userId,

                program_id:
                    program.id,

                batch_id:
                    null,

                enrollment_path:
                    enrollmentPath,

                status:
                    "PENDING_PAYMENT",

                amount:
                    programFee

            };


            console.log(
                "NITRIXA: Creating enrollment:",
                {
                    userId,
                    programId:
                        program.id,
                    enrollmentPath,
                    amount:
                        programFee
                }
            );


            const {
                data: enrollment,
                error: enrollmentError
            } =
                await adminClient

                    .from("enrollments")

                    .insert(
                        enrollmentPayload
                    )

                    .select(`
                        id,
                        user_id,
                        program_id,
                        batch_id,
                        enrollment_path,
                        status,
                        amount,
                        created_at
                    `)

                    .single();


            if (
                enrollmentError
            ) {

                console.error(
                    "NITRIXA: Enrollment creation failed:",
                    enrollmentError
                );


                /*
                 * PostgreSQL unique constraint can catch
                 * simultaneous duplicate enrollment attempts.
                 *
                 * Return a clean message instead of exposing
                 * database internals.
                 */

                if (
                    enrollmentError.code ===
                    "23505"
                ) {

                    return jsonResponse(

                        {
                            success: false,

                            code:
                                "DUPLICATE_ENROLLMENT",

                            message:
                                "An enrollment for this program and path already exists."

                        },

                        409

                    );

                }


                return jsonResponse(

                    {
                        success: false,

                        message:
                            "Unable to create your enrollment. Please try again."

                    },

                    500

                );

            }


            /* =============================================
               SUCCESS
               ============================================= */

            console.log(
                "NITRIXA: Enrollment created successfully:",
                enrollment.id
            );


            return jsonResponse(

                {

                    success:
                        true,

                    reused:
                        false,

                    message:
                        "Enrollment created successfully.",

                    enrollmentId:
                        enrollment.id,

                    enrollmentStatus:
                        enrollment.status,

                    enrollmentPath:
                        enrollment.enrollment_path,

                    amount:
                        Number(
                            enrollment.amount
                        ),

                    program: {

                        id:
                            program.id,

                        name:
                            program.name,

                        slug:
                            program.slug,

                        programType:
                            program.program_type

                    }

                },

                200

            );


        } catch (error) {

            console.error(
                "NITRIXA: Unexpected create-enrollment error:",
                error
            );


            return jsonResponse(

                {
                    success: false,

                    message:
                        "An unexpected server error occurred. Please try again."

                },

                500

            );

        }

    }
);