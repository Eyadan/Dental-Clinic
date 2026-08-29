import { NextResponse } from "next/server";

const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_ACCESS_TOKEN ?? "";
const GRAPH_API_VERSION = process.env.MESSENGER_API_VERSION ?? "v21.0";

const PROFILE_CONFIG = {
  get_started: {
    payload: "GET_STARTED",
  },
  greeting: [
    {
      locale: "default",
      text: "Welcome to Dental Clinic! Tap Get Started to book an appointment, check hours, or contact us.",
    },
  ],
  persistent_menu: [
    {
      locale: "default",
      composer_input_disabled: false,
      call_to_actions: [
        {
          type: "postback",
          title: "Book Appointment",
          payload: "MENU_BOOK",
        },
        {
          type: "postback",
          title: "Clinic Hours",
          payload: "MENU_HOURS",
        },
        {
          type: "postback",
          title: "Contact Us",
          payload: "MENU_CONTACT",
        },
        {
          type: "postback",
          title: "Cancel Appointment",
          payload: "MENU_CANCEL",
        },
      ],
    },
  ],
  ice_breakers: [
    {
      question: "Book a new appointment",
      payload: "ICE_BOOK",
    },
    {
      question: "What are your clinic hours?",
      payload: "ICE_HOURS",
    },
    {
      question: "I need to reschedule my appointment",
      payload: "ICE_RESCHEDULE",
    },
  ],
};

export async function POST() {
  if (!PAGE_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "MESSENGER_PAGE_ACCESS_TOKEN not configured" },
      { status: 500 },
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PROFILE_CONFIG),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Failed to set profile" },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Messenger profile configured: get_started, greeting, persistent_menu, ice_breakers",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  if (!PAGE_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "MESSENGER_PAGE_ACCESS_TOKEN not configured" },
      { status: 500 },
    );
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`;

  try {
    const response = await fetch(url, { method: "GET" });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
