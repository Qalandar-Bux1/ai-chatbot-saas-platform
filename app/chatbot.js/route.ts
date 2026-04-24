import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { siteConfig } from "@/config/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /chatbot.js?botId=<chatbotId>
 *
 * Serves a lightweight, per-chatbot widget. The response is plain
 * JavaScript that:
 *   1. Renders a floating launcher button iframe
 *   2. Renders a hidden chat window iframe
 *   3. Wires up open/close postMessage events
 *
 * Security notes:
 *   - `botId` is validated as a CUID-like token to prevent any kind of
 *     string injection into the generated script body.
 *   - We confirm the chatbot exists before emitting the script; unknown
 *     ids get a no-op script + 404 so the embed page can detect it.
 *   - No user secrets are ever shipped to the browser. The widget only
 *     knows the chatbot id; the actual OpenAI key and the owner's
 *     knowledge base live server-side and are scoped per-request.
 *   - CORS is set to `*` because the script must be loadable from any
 *     customer domain.
 */

const BOT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

function buildScript(chatbotId: string, baseUrl: string): string {
    const clean = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    return `/*! SmartBot AI embed for ${chatbotId} */
(function () {
  if (window.__smartbotAiLoaded_${chatbotId}) return;
  window.__smartbotAiLoaded_${chatbotId} = true;

  var BASE = ${JSON.stringify(clean)};
  var BOT  = ${JSON.stringify(chatbotId)};
  var BTN_ID    = "smartbot-ai-chatbot-button-iframe";
  var WINDOW_ID = "smartbot-ai-chatbot-iframe";

  function mount() {
    if (document.getElementById(BTN_ID)) return;

    var btn = document.createElement("iframe");
    btn.src = BASE + "/embed/" + BOT + "/button?chatbox=false";
    btn.id = BTN_ID;
    btn.style.cssText = "z-index:2147483646;margin-right:1rem;margin-bottom:1rem;position:fixed;right:0;bottom:0;width:56px;height:56px;border:0;border:2px solid #e2e8f0;border-radius:50%;color-scheme:none;background:none;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);";
    document.body.appendChild(btn);

    var win = document.createElement("iframe");
    win.src = BASE + "/embed/" + BOT + "/window?chatbox=false&withExitX=true";
    win.id = WINDOW_ID;
    win.allowFullscreen = true;
    win.allow = "clipboard-read; clipboard-write";
    win.style.cssText = "z-index:2147483647;margin-right:1rem;margin-bottom:6rem;display:none;position:fixed;right:0;bottom:0;pointer-events:none;overflow:hidden;height:65vh;border:2px solid #e2e8f0;border-radius:0.375rem;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);width:30rem;";
    document.body.appendChild(win);

    window.addEventListener("message", function (t) {
      var e = document.getElementById(WINDOW_ID);
      var s = document.getElementById(BTN_ID);
      if (!e || !s) return;

      if (t.data && t.data.type === "checkScrollbar" && t.data.hasScrollbar) {
        s.style.width = "60px";
        s.style.height = "60px";
        return;
      }

      if (t.data === "openChat") {
        e.contentWindow.postMessage("openChat", "*");
        s.contentWindow.postMessage("openChat", "*");
        e.style.pointerEvents = "auto";
        e.style.display = "block";
        if (window.innerWidth < 640) {
          e.style.position = "fixed";
          e.style.width = "100%";
          e.style.height = "100%";
          e.style.top = "0";
          e.style.left = "0";
          e.style.zIndex = "2147483647";
        } else {
          e.style.position = "fixed";
          e.style.width = "30rem";
          e.style.height = "65vh";
          e.style.bottom = "0";
          e.style.right = "0";
          e.style.top = "";
          e.style.left = "";
        }
      } else if (t.data === "closeChat") {
        e.style.display = "none";
        e.style.pointerEvents = "none";
        e.contentWindow.postMessage("closeChat", "*");
        s.contentWindow.postMessage("closeChat", "*");
      }
    });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
`;
}

function jsResponse(body: string, status = 200) {
    return new NextResponse(body, {
        status,
        headers: {
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "X-Content-Type-Options": "nosniff",
        },
    });
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
        },
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get("botId") ?? searchParams.get("chatbotId") ?? "";

    if (!botId || !BOT_ID_RE.test(botId)) {
        return jsResponse(
            `console.error("[SmartBot AI] Missing or invalid botId in <script src=\\"chatbot.js?botId=...\\">");`,
            400,
        );
    }

    const chatbot = await db.chatbot.findUnique({
        where: { id: botId },
        select: { id: true },
    });

    if (!chatbot) {
        return jsResponse(
            `console.error("[SmartBot AI] Chatbot ${botId} not found or not available.");`,
            404,
        );
    }

    return jsResponse(buildScript(chatbot.id, siteConfig.url));
}
