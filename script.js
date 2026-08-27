const PSG_TEAM_ID = "133714";
const NEXT_EVENT_URL = `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${PSG_TEAM_ID}`;
const TEAM_LOOKUP_URL = "https://www.thesportsdb.com/api/v1/json/3/lookupteam.php?id=";

const rainNode = document.querySelector(".rain");
const storyScroll = document.querySelector("[data-story-scroll]");
const nextGamesNode = document.querySelector("[data-next-games]");
let countdownTimer = null;

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "DATE TBC";
  }

  const parsed = new Date(`${dateValue}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed).toUpperCase();
}

function formatTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return "TIME TBC";
  }

  const parsed = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(parsed.getTime())) {
    return timeValue.slice(0, 5);
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);
}

function formatWeekday(dateValue) {
  if (!dateValue) {
    return "DAY TBC";
  }

  const parsed = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "DAY TBC";
  }

  return new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(parsed).toUpperCase();
}

function displayTeamName(value) {
  if (value === "Lille") {
    return "LOSC Lille";
  }

  return value || "Team TBC";
}

async function fetchTeamBadge(teamId) {
  if (!teamId) {
    return null;
  }

  const response = await fetch(`${TEAM_LOOKUP_URL}${teamId}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Team lookup failed: ${response.status}`);
  }

  const payload = await response.json();
  const team = payload?.teams?.[0];

  return team
    ? {
        name: team.strTeam || "Team TBC",
        badge: team.strBadge || team.strTeamBadge || "",
      }
    : null;
}

function formatCountdown(targetTime) {
  const diff = targetTime - Date.now();

  if (!Number.isFinite(diff) || diff <= 0) {
    return "LIVE";
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}D ${hours}H ${minutes}M`;
  }

  if (hours > 0) {
    return `${hours}H ${minutes}M ${seconds}S`;
  }

  return `${minutes}M ${seconds}S`;
}

function getCountdownParts(targetTime) {
  const diff = Math.max(0, targetTime - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60
  };
}

function parseEventTime(event) {
  const dateValue = event.dateEventLocal || event.dateEvent;
  const timeValue = event.strTimeLocal || event.strTime;

  if (!dateValue) {
    return null;
  }

  const iso = `${dateValue}T${timeValue || "20:00:00"}`;
  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function clearCountdownTimer() {
  if (countdownTimer) {
    window.clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function renderNextGame(event, homeTeam, awayTeam) {
  if (!nextGamesNode) {
    return;
  }

  const home = displayTeamName(event.strHomeTeam);
  const away = displayTeamName(event.strAwayTeam);
  const homeBadge = homeTeam?.badge || event.strHomeTeamBadge || "";
  const awayBadge = awayTeam?.badge || event.strAwayTeamBadge || "";
  const dateLabel = formatDate(event.dateEventLocal || event.dateEvent);
  const weekdayLabel = formatWeekday(event.dateEventLocal || event.dateEvent);
  const timeLabel = formatTime(event.dateEventLocal || event.dateEvent, event.strTimeLocal || event.strTime);
  const kickoff = parseEventTime(event);
  nextGamesNode.innerHTML = `
    <article class="next-game">
      <div class="next-game__teams">
        <span class="next-game__team">
          <img class="next-game__badge" src="${homeBadge}" alt="${homeTeam?.name || home}">
        </span>
        <span class="next-game__versus" aria-hidden="true">vs</span>
        <span class="next-game__team">
          <img class="next-game__badge" src="${awayBadge}" alt="${awayTeam?.name || away}">
        </span>
      </div>
      <div class="next-game__details">
        <div class="next-game__date">${dateLabel}<span><strong>${weekdayLabel}</strong><i></i>${timeLabel} CET</span></div>
        <div class="next-game__countdown-label">Live Countdown</div>
        <div class="next-game__countdown" data-next-countdown>
          <span><b data-countdown-days>00</b><small>Days</small></span>
          <span><b data-countdown-hours>00</b><small>Hours</small></span>
          <span><b data-countdown-minutes>00</b><small>Minutes</small></span>
          <span><b data-countdown-seconds>00</b><small>Seconds</small></span>
        </div>
      </div>
    </article>
  `;

  clearCountdownTimer();
  if (kickoff) {
    const update = () => {
      const parts = getCountdownParts(kickoff);
      ["days", "hours", "minutes", "seconds"].forEach((part) => {
        setText(nextGamesNode.querySelector(`[data-countdown-${part}]`), String(parts[part]).padStart(2, "0"));
      });
    };
    update();
    countdownTimer = window.setInterval(update, 1000);
  }
}

async function loadNextGames() {
  try {
    const response = await fetch(NEXT_EVENT_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const events = Array.isArray(payload?.events) ? payload.events : [];

    if (!events.length) {
      throw new Error("No upcoming events found");
    }

    const event = events[0];
    // The event response already includes both team badge URLs. Optional
    // lookups enrich names but must never prevent the fixture from rendering.
    const [homeTeam, awayTeam] = await Promise.all([
      fetchTeamBadge(event.idHomeTeam).catch(() => null),
      fetchTeamBadge(event.idAwayTeam).catch(() => null)
    ]);

    renderNextGame(event, homeTeam, awayTeam);
  } catch (error) {
    clearCountdownTimer();
    if (nextGamesNode) {
      renderNextGame({
        strHomeTeam: "Lille",
        strAwayTeam: "Paris Saint-Germain",
        strHomeTeamBadge: "https://r2.thesportsdb.com/images/media/team/badge/2giize1534005340.png",
        strAwayTeamBadge: "https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png",
        dateEvent: "2026-08-28",
        strTime: "18:45:00"
      }, null, null);
    }
  }
}

function buildRain() {
  if (!rainNode) {
    return;
  }

  const totalDrops = window.innerWidth < 700 ? 45 : 80;
  const fragment = document.createDocumentFragment();

  rainNode.replaceChildren();

  for (let index = 0; index < totalDrops; index += 1) {
    const drop = document.createElement("span");
    const left = Math.random() * 100;
    const delay = Math.random() * -4;
    const duration = 0.8 + Math.random() * 1.4;
    const opacity = 0.1 + Math.random() * 0.22;
    const length = 40 + Math.random() * 120;

    drop.className = "rain-drop";
    drop.style.left = `${left}%`;
    drop.style.height = `${length}px`;
    drop.style.opacity = opacity.toFixed(2);
    drop.style.animationDelay = `${delay.toFixed(2)}s`;
    drop.style.animationDuration = `${duration.toFixed(2)}s`;
    fragment.appendChild(drop);
  }

  rainNode.appendChild(fragment);
}

function initStoryScroll() {
  if (!storyScroll || !window.gsap || !window.ScrollTrigger) {
    return;
  }

  const viewport = storyScroll.querySelector(".story-scroll__viewport");
  const track = storyScroll.querySelector(".story-scroll__track");

  if (!viewport || !track) {
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);
  const media = window.gsap.matchMedia();

  media.add("(min-width: 981px)", () => {
    const panels = window.gsap.utils.toArray(".story-panel", track);
    const getTravel = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const tween = window.gsap.to(track, {
      x: () => -getTravel(),
      ease: "none",
      overwrite: true,
      scrollTrigger: {
        trigger: storyScroll,
        start: "top top",
        end: () => `+=${getTravel()}`,
        pin: viewport,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        snap: panels.length > 1 ? {
          snapTo: (value) => {
            const segments = panels.length - 1;

            if (segments <= 0) {
              return 0;
            }

            return Math.round(value * segments) / segments;
          },
          duration: { min: 0.18, max: 0.4 },
          delay: 0.04,
          ease: "power1.inOut"
        } : false
      }
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      window.gsap.set(track, { clearProps: "transform" });
    };
  });
}

buildRain();
initStoryScroll();
renderNextGame({
  strHomeTeam: "Lille",
  strAwayTeam: "Paris Saint-Germain",
  strHomeTeamBadge: "https://r2.thesportsdb.com/images/media/team/badge/2giize1534005340.png",
  strAwayTeamBadge: "https://r2.thesportsdb.com/images/media/team/badge/rwqrrq1473504808.png",
  dateEvent: "2026-08-28",
  strTime: "18:45:00"
}, null, null);
loadNextGames();
window.addEventListener("resize", buildRain);
