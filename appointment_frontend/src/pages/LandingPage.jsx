// Public landing page — shown to unauthenticated visitors.
import { Link } from 'react-router-dom';

// ── Navbar ───────────────────────────────────────────────────────────────────
function LandingNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F6E56] text-white font-extrabold text-base shadow">
            Z
          </span>
          <span className="text-xl font-extrabold text-gray-900 tracking-tight">ZenFlow</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-8 text-sm font-semibold text-gray-500">
          <a href="#features" className="hover:text-[#0F6E56] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#0F6E56] transition-colors">How it works</a>
          <a href="#classes" className="hover:text-[#0F6E56] transition-colors">Classes</a>
        </nav>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-[#0F6E56] px-4 py-2 text-sm font-bold text-[#0F6E56] hover:bg-[#E1F5EE] transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white hover:bg-[#1D9E75] transition-colors shadow-sm"
          >
            Sign Up Free
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E1F5EE] text-2xl mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="font-extrabold text-gray-900 text-base mb-1">{title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, title, desc }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#0F6E56] text-white font-extrabold text-sm shadow-md">
        {step}
      </div>
      <div>
        <h4 className="font-bold text-gray-900 text-base">{title}</h4>
        <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── Class Pill ────────────────────────────────────────────────────────────────
function ClassPill({ icon, name, duration, price }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:shadow-md hover:border-[#0F6E56]/30 transition-all">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="font-bold text-gray-900 text-sm">{name}</p>
          <p className="text-xs text-gray-400">{duration}</p>
        </div>
      </div>
      <span className="text-sm font-extrabold text-[#0F6E56]">{price}</span>
    </div>
  );
}

// ── Testimonial Card ──────────────────────────────────────────────────────────
function Testimonial({ name, role, text, avatar }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-600 leading-relaxed italic">"{text}"</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0F6E56] text-white text-sm font-bold">
          {avatar}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{role}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <LandingNavbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-[#071f18] via-[#0F6E56] to-[#1D9E75] overflow-hidden pt-20">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[400px] w-[400px] rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[700px] w-[700px] rounded-full bg-[#1D9E75]/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-1.5 text-xs text-white/80 font-semibold mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Yoga &amp; Wellness Booking Platform
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Book Your Perfect<br />
            <span className="text-[#a7f3d0]">Yoga Session</span><br />
            In Seconds.
          </h1>

          <p className="mt-6 text-white/70 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Discover classes, workshops &amp; private sessions with top instructors.
            Simple scheduling. Secure payments. Instant confirmation.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto rounded-2xl bg-white px-8 py-4 text-base font-extrabold text-[#0F6E56] hover:bg-[#E1F5EE] transition-all shadow-xl hover:scale-105 active:scale-100"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto rounded-2xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 backdrop-blur transition-all"
            >
              Log In →
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/60 text-xs font-semibold">
            <span>✓ Free to register</span>
            <span>✓ Secure Razorpay payments</span>
            <span>✓ OTP verification</span>
            <span>✓ Instant booking confirmation</span>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L1440 80L1440 40C1200 80 800 0 480 40C280 70 120 20 0 40L0 80Z" fill="#f8fafc" />
          </svg>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-[#0F6E56] text-sm font-bold uppercase tracking-widest mb-2">Why ZenFlow</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Everything you need to book &amp; manage</h2>
            <p className="mt-3 text-gray-500 text-base max-w-xl mx-auto">A complete platform for yoga studios, instructors, and wellness seekers.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon="" title="Smart Scheduling" desc="Weekly recurring or flexible date slots — the system finds available times automatically." />
            <FeatureCard icon="" title="Secure Payments" desc="Integrated Razorpay payments with instant confirmation. Pay only when you book." />
            <FeatureCard icon="" title="OTP Verification" desc="Email OTP ensures only verified users book sessions — zero spam, full security." />
            <FeatureCard icon="" title="Multi-Capacity Classes" desc="Book for group classes or private 1-on-1 sessions with your favourite instructor." />
            <FeatureCard icon="" title="Easy Rescheduling" desc="Can't make it? Reschedule your booking in one tap. Full history maintained." />
            <FeatureCard icon="" title="Organiser Dashboard" desc="Studio owners get reports, bookings overview, and resource management all in one." />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <p className="text-[#0F6E56] text-sm font-bold uppercase tracking-widest mb-2">Simple Process</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8">Book a class in 3 easy steps</h2>
              <div className="flex flex-col gap-7">
                <StepCard step="1" title="Create your account" desc="Sign up with your email and verify via OTP. Takes less than 2 minutes." />
                <StepCard step="2" title="Browse &amp; choose a class" desc="Filter by type, check instructor, duration, price and upcoming sessions." />
                <StepCard step="3" title="Pay &amp; get confirmed" desc="Secure Razorpay payment and instant booking confirmation sent to your email." />
              </div>
              <Link
                to="/signup"
                className="mt-10 inline-block rounded-2xl bg-[#0F6E56] px-8 py-3.5 font-bold text-white hover:bg-[#1D9E75] transition shadow-md"
              >
                Start Booking →
              </Link>
            </div>

            {/* Visual card stack */}
            <div className="relative hidden lg:block">
              <div className="absolute top-4 right-4 w-72 rounded-2xl bg-[#E1F5EE] p-5 rotate-3 shadow-md">
                <div className="h-4 w-32 bg-[#0F6E56]/30 rounded mb-2" />
                <div className="h-3 w-48 bg-[#0F6E56]/20 rounded mb-1" />
                <div className="h-3 w-40 bg-[#0F6E56]/20 rounded" />
              </div>
              <div className="relative w-full rounded-2xl bg-white border border-slate-100 shadow-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-[#0F6E56] flex items-center justify-center text-white font-bold">M</div>
                  <div>
                    <div className="h-3 w-32 bg-slate-200 rounded mb-1" />
                    <div className="h-2 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                    <div key={d} className={`rounded-lg p-2 text-center text-xs font-bold ${d === 'Wed' ? 'bg-[#0F6E56] text-white' : 'bg-slate-50 text-slate-400'}`}>{d}</div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-xl bg-[#E1F5EE] p-3">
                  <div>
                    <p className="text-xs font-bold text-[#0F6E56]">Morning Hatha Yoga</p>
                    <p className="text-xs text-gray-400">7:00 AM · 60 min</p>
                  </div>
                  <button className="rounded-lg bg-[#0F6E56] px-3 py-1.5 text-xs font-bold text-white">Book</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAMPLE CLASSES ────────────────────────────────────────────────── */}
      <section id="classes" className="py-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-[#0F6E56] text-sm font-bold uppercase tracking-widest mb-2">What's On</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Popular Classes</h2>
            <p className="mt-3 text-gray-500 text-base">Sign in to see all available sessions and book instantly.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
            <ClassPill icon="" name="Morning Hatha Yoga" duration="60 min · Weekly" price="₹500" />
            <ClassPill icon="" name="Vinyasa Flow" duration="60 min · Weekly" price="₹600" />
            <ClassPill icon="" name="Guided Meditation" duration="45 min · Weekly" price="₹150" />
            <ClassPill icon="" name="Private Yoga Session" duration="60 min · Flexible" price="₹1,500" />
            <ClassPill icon="" name="Ashtanga Workshop" duration="90 min · Flexible" price="₹1,200" />
            <ClassPill icon="" name="Kids Yoga" duration="45 min · Weekly" price="₹250" />
          </div>
          <div className="text-center mt-10">
            <Link
              to="/signup"
              className="inline-block rounded-2xl bg-[#0F6E56] px-8 py-3.5 font-bold text-white hover:bg-[#1D9E75] transition shadow-md"
            >
              See All Classes →
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center mb-12">
            <p className="text-[#0F6E56] text-sm font-bold uppercase tracking-widest mb-2">Loved By Students</p>
            <h2 className="text-3xl font-extrabold text-gray-900">What our community says</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Testimonial avatar="A" name="Ananya Patel" role="Yoga Student" text="Booking my morning yoga has never been easier. I love how I get an instant confirmation and can reschedule if I can't make it!" />
            <Testimonial avatar="V" name="Vikram Singh" role="Regular Member" text="The payment process is seamless. I booked a private session and got all the details right away. Highly recommend ZenFlow!" />
            <Testimonial avatar="P" name="Priya Nair" role="Wellness Enthusiast" text="ZenFlow helped me discover the Ashtanga workshop I'd been looking for. Simple, clean, and works perfectly every time." />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-br from-[#0a4d3c] to-[#1D9E75]">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Start your wellness journey today</h2>
          <p className="mt-4 text-white/70 text-base">Join thousands of students booking smarter with ZenFlow.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="w-full sm:w-auto rounded-2xl bg-white px-8 py-4 text-base font-extrabold text-[#0F6E56] hover:bg-[#E1F5EE] transition shadow-xl hover:scale-105"
            >
              Create Free Account
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto rounded-2xl border-2 border-white/40 px-8 py-4 text-base font-bold text-white hover:bg-white/10 transition"
            >
              Already have an account?
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="bg-[#071f18] py-8 text-center text-xs text-white/40">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F6E56] text-white font-extrabold text-sm">Z</span>
          <span className="font-bold text-white/60">ZenFlow</span>
        </div>
        <p>© {new Date().getFullYear()} ZenFlow. All rights reserved.</p>
        <div className="mt-2 flex justify-center gap-6 text-white/30">
          <Link to="/login" className="hover:text-white/60 transition">Log In</Link>
          <Link to="/signup" className="hover:text-white/60 transition">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}
