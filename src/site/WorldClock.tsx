import { useEffect, useMemo, useRef, useState } from 'react'
import ContactMarks from './ContactMarks'
import { CONTACT, RESUME_URL } from './identity'

/**
 * One face on the dial: a city, the zone its clock actually runs on, and the
 * standard offset from UTC that fixes its place on the ring. The cities are the
 * ones that usually stand for their offset — Honolulu, London, Tokyo — with
 * San Francisco, Salt Lake City, Pittsburgh and Taipei asked for by name in
 * place of the Los Angeles / Denver / New York / Beijing that would otherwise
 * stand for those offsets.
 *
 * The two are kept apart on purpose. The hands show the city's real time, read
 * through Intl, so a summer-time city is right rather than an hour behind — the
 * whole point of a clock. But the *placement* uses the standard offset, because
 * daylight saving does not move a city an hour round the world: it would stack
 * Salt Lake City in June exactly where Mexico City always sits and leave a hole
 * an hour further round. Standard offsets keep the twenty-four evenly spread,
 * and the cost is that a city on summer time reads an hour ahead of the slot it
 * is standing in.
 */
type City = { code: string; name: string; tz: string; offset: number }

const CITIES: City[] = [
  { code: 'PPG', name: 'Pago Pago', tz: 'Pacific/Pago_Pago', offset: -11 },
  { code: 'HNL', name: 'Honolulu', tz: 'Pacific/Honolulu', offset: -10 },
  { code: 'ANC', name: 'Anchorage', tz: 'America/Anchorage', offset: -9 },
  { code: 'SFO', name: 'San Francisco', tz: 'America/Los_Angeles', offset: -8 },
  { code: 'SLC', name: 'Salt Lake City', tz: 'America/Denver', offset: -7 },
  { code: 'CHI', name: 'Chicago', tz: 'America/Chicago', offset: -6 },
  { code: 'PIT', name: 'Pittsburgh', tz: 'America/New_York', offset: -5 },
  { code: 'SCL', name: 'Santiago', tz: 'America/Santiago', offset: -4 },
  { code: 'BUE', name: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', offset: -3 },
  { code: 'FEN', name: 'Noronha', tz: 'America/Noronha', offset: -2 },
  { code: 'PDL', name: 'Azores', tz: 'Atlantic/Azores', offset: -1 },
  { code: 'LON', name: 'London', tz: 'Europe/London', offset: 0 },
  { code: 'PAR', name: 'Paris', tz: 'Europe/Paris', offset: 1 },
  { code: 'CAI', name: 'Cairo', tz: 'Africa/Cairo', offset: 2 },
  { code: 'MOW', name: 'Moscow', tz: 'Europe/Moscow', offset: 3 },
  { code: 'DXB', name: 'Dubai', tz: 'Asia/Dubai', offset: 4 },
  { code: 'KHI', name: 'Karachi', tz: 'Asia/Karachi', offset: 5 },
  { code: 'DAC', name: 'Dhaka', tz: 'Asia/Dhaka', offset: 6 },
  { code: 'BKK', name: 'Bangkok', tz: 'Asia/Bangkok', offset: 7 },
  { code: 'TPE', name: 'Taipei', tz: 'Asia/Taipei', offset: 8 },
  { code: 'TYO', name: 'Tokyo', tz: 'Asia/Tokyo', offset: 9 },
  { code: 'SYD', name: 'Sydney', tz: 'Australia/Sydney', offset: 10 },
  { code: 'NOU', name: 'Nouméa', tz: 'Pacific/Noumea', offset: 11 },
  { code: 'AKL', name: 'Auckland', tz: 'Pacific/Auckland', offset: 12 },
]

// Geometry, as percentages of the square the dial is drawn in — the same
// proportions as the sketch, where a 50px clock rides a 500px circle on a
// 1200px canvas. Neighbouring centres land 2·R·sin(7.5°) ≈ 11% apart, so a face
// this size clears the next one round with room to spare.
const RING = 41.7
const FACE = 9.2
// City names ride just outside the ring rather than tucked under each face the
// way the sketch does it: "Salt Lake City" set under its own clock is wide
// enough to lie across the two faces either side of it, and pushing the names
// out past the circle is the only placement that keeps twenty-four of them off
// each other's dials.
const LABEL = 49.5

// Degrees per hour of local time. The whole dial is a 24-hour clock: one turn a
// day, an hour of the world per step.
const PER_HOUR = 360 / 24

/** Wraps a difference in hours into (-12, 12] — the short way round the dial. */
function wrapHours(h: number): number {
  return ((((h + 12) % 24) + 24) % 24) - 12
}

/**
 * The city's own wall-clock time, in fractional hours, daylight saving and all.
 * Intl stops at whole seconds; the milliseconds come off the same instant,
 * which is exact because every zone here is a whole number of minutes from UTC.
 */
function localHours(fmt: Intl.DateTimeFormat, at: Date): number {
  let h = 0
  let m = 0
  let s = 0
  for (const part of fmt.formatToParts(at)) {
    if (part.type === 'hour') h = Number(part.value)
    else if (part.type === 'minute') m = Number(part.value)
    else if (part.type === 'second') s = Number(part.value)
  }
  return h + m / 60 + (s + at.getMilliseconds() / 1000) / 3600
}

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

export default function WorldClock({
  email,
  phone,
  linkedinUrl,
  resumeUrl,
  portfolioHref = '/technical',
}: {
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  resumeUrl?: string | null
  portfolioHref?: string
}) {
  // Settings win when the row carries a value, and a blank or missing row
  // falls back — the hub is never three dead icons on a fresh database.
  const mail = email || CONTACT.email
  const tel = phone || CONTACT.phone
  const linkedin = linkedinUrl || CONTACT.linkedin
  const resume = resumeUrl || RESUME_URL

  const sectionRef = useRef<HTMLElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [live, setLive] = useState(false)

  // Nothing ticks while the dial is off screen — the hero above it is a screen
  // and a half of scroll on its own, and twenty-four faces re-drawn ten times a
  // second is not work to do behind someone's back.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setLive(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setLive(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Ten frames a second: enough for the second hands to sweep rather than
  // stamp, cheap enough that twenty-four of them cost nothing. rAF rather than
  // an interval, so a backgrounded tab stops paying for a clock nobody is
  // looking at. A clock keeps time whatever the motion preference is, and
  // nothing here flies, fades or spins beyond the hands themselves.
  useEffect(() => {
    if (!live) return
    let frame = 0
    let last = 0
    const step = (t: number) => {
      frame = requestAnimationFrame(step)
      if (t - last < 100) return
      last = t
      setNow(new Date())
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [live])

  // The visitor's own zone, asked for once. Used to pick out the one face on
  // the ring that is telling them their own time.
  const viewerTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return ''
    }
  }, [])

  // Twenty-four formatters, built once and reused every tick.
  const formatters = useMemo(
    () =>
      CITIES.map(
        (city) =>
          new Intl.DateTimeFormat('en-GB', {
            timeZone: city.tz,
            hourCycle: 'h23',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
      ),
    [],
  )

  const faces = useMemo(() => {
    // Read off UTC, not off the visitor's own clock: a laptop set to Sydney has
    // to give the same dial as one set to Pittsburgh.
    const utc =
      now.getUTCHours() +
      now.getUTCMinutes() / 60 +
      (now.getUTCSeconds() + now.getMilliseconds() / 1000) / 3600

    const placed = CITIES.map((city, i) => {
      const local = localHours(formatters[i], now)
      // Straight out of the sketch: a face's place on the big circle *is* the
      // time there, an hour to the step, midnight at the top. Which makes the
      // ring the twenty-fifth clock — it turns once a day, carrying noon round
      // the bottom and midnight round the top.
      const slot = (((utc + city.offset) % 24) + 24) % 24
      const rad = (slot * PER_HOUR * Math.PI) / 180
      return {
        city,
        // What the city is actually running on right now, summer time and all,
        // which is what the visitor's own offset has to be compared against.
        current: wrapHours(local - utc),
        time: `${pad(local)}:${pad((local % 1) * 60)}`,
        hour: (local % 12) * 30,
        minute: (local % 1) * 360,
        second: ((local * 60) % 1) * 360,
        x: 50 + Math.sin(rad) * RING,
        y: 50 - Math.cos(rad) * RING,
        labelX: 50 + Math.sin(rad) * LABEL,
        labelY: 50 - Math.cos(rad) * LABEL,
      }
    })

    // The one face drawn at full strength is the visitor's own: their city if
    // it is on the ring, otherwise whichever one is keeping the same time they
    // are — that clock reads their time even if it is not their city. Zones a
    // half or quarter hour off the hour (India, Nepal, Chatham) match nothing
    // here, and nothing is highlighted rather than something being singled out
    // that would be wrong by half an hour.
    const viewerOffset = -now.getTimezoneOffset() / 60
    let mine = placed.findIndex((face) => face.city.tz === viewerTz)
    if (mine < 0) mine = placed.findIndex((face) => Math.abs(face.current - viewerOffset) < 0.01)

    return placed.map((face, i) => ({ ...face, isViewer: i === mine }))
  }, [formatters, now, viewerTz])

  return (
    <section
      ref={sectionRef}
      // The header reads this off the DOM: it is the one band dark enough that
      // the nav has to turn white to stay legible crossing it.
      data-header-dark
      className="relative z-10 bg-clay px-6 py-20 sm:px-12 sm:py-32"
      aria-label="World clock"
    >
      {/* The square the dial is drawn in. It stops short of the viewport edge
          because each face carries its label underneath, and the bottom of the
          ring hangs its label past the edge of the circle. */}
      <div className="relative mx-auto aspect-square w-full max-w-[720px]">
        {/* The track the faces ride on, and the two hours that never move: the
            dial turns under them, midnight at the top, noon at the foot. */}
        <div
          className="absolute rounded-full border border-dashed border-white/20"
          style={{ inset: `${50 - RING}%` }}
          aria-hidden="true"
        />
        <p
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[220%] text-[9px] tracking-[0.35em] text-white/70 uppercase sm:text-[10px]"
          aria-hidden="true"
        >
          Midnight
        </p>
        <p
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[220%] text-[9px] tracking-[0.35em] text-white/70 uppercase sm:text-[10px]"
          aria-hidden="true"
        >
          Noon
        </p>

        {faces.map((face) => (
          <div key={face.city.code}>
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${face.x}%`, top: `${face.y}%`, width: `${FACE}%` }}
              role="img"
              title={`${face.city.name} — ${face.time}`}
              aria-label={`${face.city.name}, ${face.time}${face.isViewer ? ', your own time' : ''}`}
            >
              <Face
                hour={face.hour}
                minute={face.minute}
                second={face.second}
                viewer={face.isViewer}
              />
            </div>
            {/* Twenty-four names round a phone-width circle would still run
                into each other out here, so the narrow layout falls back to the
                three-letter code; the full name stays on the face's own label,
                for anyone reading by ear or hovering. */}
            <span
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-[8px] tracking-[0.12em] whitespace-nowrap uppercase sm:text-[9px] ${
                face.isViewer ? 'text-white' : 'text-white/55'
              }`}
              style={{ left: `${face.labelX}%`, top: `${face.labelY}%` }}
              aria-hidden="true"
            >
              <span className="sm:hidden">{face.city.code}</span>
              <span className="hidden sm:inline">{face.city.name}</span>
            </span>
          </div>
        ))}

        {/* The hub. Everything here is real contact, so it sits inside the dial
            rather than under it. */}
        <div className="absolute top-1/2 left-1/2 flex w-[58%] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5 text-center">
          {/* The two pills stack, one over the other, at every width. */}
          <div className="flex flex-col items-center gap-3">
           
            <a
              href={resume}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white px-4 py-2 text-[9px] tracking-[0.22em] text-white uppercase transition-colors hover:bg-white hover:text-clay sm:px-6 sm:py-2.5 sm:text-[11px]"
            >
              Resume
            </a>
            {/* An external portfolio URL out of settings opens in its own
                tab; the default is a route on this site, which must not. */}
            <a
              href={portfolioHref}
              {...(portfolioHref.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="rounded-full border border-white px-4 py-2 text-[9px] tracking-[0.22em] text-white uppercase transition-colors hover:bg-white hover:text-clay sm:px-6 sm:py-2.5 sm:text-[11px]"
            >
              Technical portfolio
            </a>
          </div>

          {/* Mail, phone, LinkedIn — the three ways to actually reach him, set
              as marks rather than as text: the addresses are long enough that
              spelling them out inside the dial would crowd the hands. */}
          <ContactMarks
            mail={mail}
            tel={tel}
            linkedin={linkedin}
            className="gap-5 sm:gap-6"
            linkClassName="text-white transition-opacity hover:opacity-70"
            iconClassName="h-5 w-5 sm:h-6 sm:w-6"
          />
        </div>
      </div>
    </section>
  )
}

// The sketch's proportions, on a 100-unit face: twelve ticks and hands at 0.7,
// 0.8 and 0.9 of the radius. No rim — the ellipse is commented out there, and
// leaving it off keeps the clocks to bare white line — the one ring on the dial
// belongs to the visitor's own clock, which is what makes it read as a mark.
// The ticks are pushed out
// to the edge rather than sitting at 0.8–0.9: at sixty pixels a face they read
// as a broken rim there, and as a starburst any further in.
const R = 44
const TICKS = Array.from({ length: 12 }, (_, i) => i * 30)
const at = (fraction: number) => 50 - R * fraction

/**
 * One small analog face: twelve ticks, three hands, white line on the clay
 * ground. Exactly one clock on the dial is ever circled — whichever is keeping
 * the visitor's own time — and it is the only one drawn at full strength.
 * Nothing says so in words: a ring round the clock that agrees with the watch
 * on your wrist is the whole of the message.
 */
function Face({
  hour,
  minute,
  second,
  viewer,
}: {
  hour: number
  minute: number
  second: number
  viewer: boolean
}) {
  const ink = viewer ? 'stroke-white' : 'stroke-white/75'
  return (
    <svg viewBox="0 0 100 100" className="w-full overflow-visible">
      {viewer && (
        <circle cx="50" cy="50" r={R} fill="none" className="stroke-white" strokeWidth="2.5" />
      )}
      {TICKS.map((deg) => (
        <line
          key={deg}
          x1="50"
          y1={at(0.84)}
          x2="50"
          y2={at(0.96)}
          className={viewer ? 'stroke-white/80' : 'stroke-white/40'}
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${deg} 50 50)`}
        />
      ))}
      <line
        x1="50"
        y1="50"
        x2="50"
        y2={at(0.7)}
        className={ink}
        strokeWidth="5"
        strokeLinecap="round"
        transform={`rotate(${hour} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2={at(0.8)}
        className={ink}
        strokeWidth="3.5"
        strokeLinecap="round"
        transform={`rotate(${minute} 50 50)`}
      />
      <line
        x1="50"
        y1="50"
        x2="50"
        y2={at(0.9)}
        className={viewer ? 'stroke-white' : 'stroke-white/60'}
        strokeWidth="1.5"
        strokeLinecap="round"
        transform={`rotate(${second} 50 50)`}
      />
    </svg>
  )
}
