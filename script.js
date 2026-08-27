const PSG_TEAM_ID = "133714";
const NEXT_EVENT_URL = `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${PSG_TEAM_ID}`;

const homeName = document.querySelector("[data-home-name]");
const awayName = document.querySelector("[data-away-name]");
const homeBadge = document.querySelector("[data-home-badge]");
const awayBadge = document.querySelector("[data-away-badge]");
const dateNode = document.querySelector("[data-date]");
const timeNode = document.querySelector("[data-time]");
const metaNode = document.querySelector("[data-meta]");
const rainNode = document.querySelector(".rain");
const storyScroll = document.querySelector("[data-story-scroll]");

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function setBadge(node, src, alt) {
  if (!node || !src) {
    return;
  }

  node.src = src;
  node.alt = alt;
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
    month: "long",
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

async function loadNextFixture() {
  try {
    const response = await fetch(NEXT_EVENT_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const event = payload?.events?.[0];

    if (!event) {
      throw new Error("No upcoming event found");
    }

    setText(homeName, event.strHomeTeam || "Home Team");
    setText(awayName, event.strAwayTeam || "Away Team");
    setBadge(homeBadge, event.strHomeTeamBadge, event.strHomeTeam || "Home team");
    setBadge(awayBadge, event.strAwayTeamBadge, event.strAwayTeam || "Away team");
    setText(dateNode, formatDate(event.dateEventLocal || event.dateEvent));
    setText(timeNode, formatTime(event.dateEventLocal || event.dateEvent, event.strTimeLocal || event.strTime));
    setText(metaNode, event.strLeague || "Upcoming fixture");
  } catch (error) {
    setText(metaNode, "Live fixture feed unavailable");
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

loadNextFixture();
buildRain();
initStoryScroll();
window.addEventListener("resize", buildRain);
