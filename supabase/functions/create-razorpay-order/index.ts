/* =========================================================
   NITRIXA TECHNOLOGIES
   CREATE RAZORPAY ORDER
   Supabase Edge Function
   ========================================================= */

import {
    createClient
} from "https://esm.sh/@supabase/supabase-js@2";


/* =========================================================
   ENVIRONMENT
========================================================= */

const SUPABASE_URL =
    Deno.env.get("SUPABASE_URL") ?? "";

const SUPABASE_ANON_KEY =
    Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const SUPABASE_SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const RAZORPAY_KEY_ID =
    Deno.env.get("RAZORPAY_KEY_ID") ?? "";

const RAZORPAY_KEY_SECRET =
    Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";


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
   VALIDATE REQUEST
========================================================= */

function getBearerToken(
    request: Request
) {

    const authorization =
        request.headers.get(
            "Authorization"
        );

    if (
        !authorization ||
        !authorization.startsWith(
            "Bearer "
        )
    ) {

        return null;

    }

    return authorization.substring(
        "Bearer ".length
    ).trim();

}


/* =========================================================
   NORMALIZE PATH
========================================================= */

function normalizePath(
    value: unknown
) {

    if (
        typeof value !== "string"
    ) {

        return "";

    }

    return value
        .trim()
        .toLowerCase();

}


/* =========================================================
   MAIN
========================================================= */

Deno.serve(
    async (request: Request) => {

        /* =================================================
           OPTIONS / PREFLIGHT
        ================================================= */

        if (
            request.method === "OPTIONS"
        ) {

            return new Response(
                "ok",
                {
                    headers:
                        corsHeaders
                }
            );

        }


        /* =================================================
           METHOD
        ================================================= */

        if (
            request.method !== "POST"
        ) {

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Method not allowed."
                },
                405
            );

        }


        /* =================================================
           CONFIG CHECK
        ================================================= */

        if (
            !SUPABASE_URL ||
            !SUPABASE_ANON_KEY ||
            !SUPABASE_SERVICE_ROLE_KEY ||
            !RAZORPAY_KEY_ID ||
            !RAZORPAY_KEY_SECRET
        ) {

            console.error(
                "NITRIXA: Required environment variables are missing."
            );

            return jsonResponse(
                {
                    success: false,
                    message:
                        "Payment service configuration is incomplete."
                },
                500
            );

        }


        try {

            /* =============================================
               AUTH TOKEN
            ============================================= */

            const accessToken =
                getBearerToken(
                    request
                );


            if (!accessToken) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Authentication is required."
                    },
                    401
                );

            }


            /* =============================================
               USER AUTH CLIENT
            ============================================= */

            const authClient =
                createClient(
                    SUPABASE_URL,
                    SUPABASE_ANON_KEY,
                    {
                        global: {
                            headers: {
                                Authorization:
                                    `Bearer ${accessToken}`
                            }
                        }
                    }
                );


            const {
                data: userData,
                error: userError
            } =
                await authClient.auth.getUser(
                    accessToken
                );


            if (
                userError ||
                !userData ||
                !userData.user
            ) {

                console.error(
                    "NITRIXA auth verification failed:",
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


            const user =
                userData.user;


            /* =============================================
               REQUEST BODY
            ============================================= */

            const body =
                await request.json();


            const programSlug =
                typeof body.programSlug === "string"
                    ? body.programSlug.trim()
                    : "";


            const enrollmentPath =
                normalizePath(
                    body.path
                );


            if (!programSlug) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Program information is required."
                    },
                    400
                );

            }


            if (
                enrollmentPath !==
                    "internship" &&
                enrollmentPath !==
                    "training-internship"
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
               ADMIN DATABASE CLIENT
               Service role stays SERVER-SIDE only.
            ============================================= */

            const adminClient =
                createClient(
                    SUPABASE_URL,
                    SUPABASE_SERVICE_ROLE_KEY,
                    {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false
                        }
                    }
                );


            /* =============================================
               LOAD TRUSTED PROGRAM
            ============================================= */

            const {
                data: program,
                error: programError
            } =
                await adminClient
                    .from("programs")
                    .select(`
                        id,
                        name,
                        slug,
                        category,
                        program_type,
                        duration,
                        fee,
                        status,
                        training_duration,
                        internship_duration,
                        payment_model
                    `)
                    .eq(
                        "slug",
                        programSlug
                    )
                    .eq(
                        "status",
                        "ACTIVE"
                    )
                    .maybeSingle();


            if (
                programError
            ) {

                console.error(
                    "NITRIXA program lookup error:",
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


            if (!program) {

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
               VALIDATE PROGRAM TYPE
            ============================================= */

            const programType =
                String(
                    program.program_type || ""
                ).toUpperCase();


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
                            "This program is not available for the Internship Only path."
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
                            "This program is not available for the Training + Internship path."
                    },
                    400
                );

            }


            /* =============================================
               TRUSTED FEE
            ============================================= */

            const numericFee =
                Number(
                    program.fee
                );


            if (
                !Number.isFinite(
                    numericFee
                ) ||
                numericFee <= 0
            ) {

                return jsonResponse(
                    {
                        success: false,
                        message:
                            "The selected program does not have a valid fee."
                    },
                    400
                );

            }


            /*
             * Razorpay accepts amount in paise.
             *
             * Example:
             *
             * ₹999
             * =
             * 99900 paise
             */

            const amountPaise =
                Math.round(
                    numericFee * 100
                );


            /* =============================================
               CREATE UNIQUE RECEIPT
            ============================================= */

            const randomPart =
                crypto.randomUUID()
                    .replace(
                        /-/g,
                        ""
                    )
                    .substring(
                        0,
                        12
                    );


            const receipt =
                `NITRIXA_${Date.now()}_${randomPart}`;


            /* =============================================
               RAZORPAY AUTH
            ============================================= */

            const razorpayCredentials =
                btoa(
                    `${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`
                );


            /* =============================================
               CREATE RAZORPAY ORDER
            ============================================= */

            const razorpayResponse =
                await fetch(
                    "https://api.razorpay.com/v1/orders",
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Basic ${razorpayCredentials}`

                        },

                        body:
                            JSON.stringify({

                                amount:
                                    amountPaise,

                                currency:
                                    "INR",

                                receipt:

                                    receipt,

                                notes: {

                                    user_id:
                                        user.id,

                                    program_id:
                                        String(
                                            program.id
                                        ),

                                    program_slug:
                                        String(
                                            program.slug
                                        ),

                                    enrollment_path:
                                        enrollmentPath

                                }

                            })

                    }
                );


            const razorpayData =
                await razorpayResponse.json();


            /* =============================================
               RAZORPAY ERROR
            ============================================= */

            if (
                !razorpayResponse.ok
            ) {

                console.error(
                    "NITRIXA Razorpay order creation failed:",
                    razorpayData
                );


                return jsonResponse(
                    {
                        success: false,
                        message:
                            "Razorpay could not create the payment order."
                    },
                    502
                );

            }


            /* =============================================
               SUCCESS
            ============================================= */

            return jsonResponse(
                {

                    success:
                        true,

                    orderId:
                        razorpayData.id,

                    keyId:
                        RAZORPAY_KEY_ID,

                    amount:
                        amountPaise,

                    currency:
                        "INR",

                    programId:
                        program.id,

                    programName:
                        program.name,

                    programSlug:
                        program.slug,

                    enrollmentPath:
                        enrollmentPath,

                    userId:
                        user.id

                },
                200
            );


        } catch (error) {

            console.error(
                "NITRIXA create-razorpay-order error:",
                error
            );


            return jsonResponse(
                {
                    success: false,
                    message:
                        "Unable to start the payment right now. Please try again."
                },
                500
            );

        }

    }
);