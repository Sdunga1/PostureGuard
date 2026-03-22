"use client";
import React, { useRef, useState, useEffect } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";

const usStats = [
  { value: "55", suffix: "M", label: "Desk workers in the U.S.", color: "#c3f5ff", countTo: 55 },
  { value: "6-7.5", suffix: " hrs", label: "Daily sitting per desk worker", color: "#66d9cc", countTo: null },
  { value: "65", suffix: "M", label: "Americans report back pain", color: "#ff9f43", countTo: 65 },
  { value: "$134.5", suffix: "B", label: "Annual healthcare spending", color: "#c3a0ff", countTo: 134.5 },
];

const globalStats = [
  { value: "619", suffix: "M", label: "People with low back pain worldwide", color: "#66d9cc", countTo: 619 },
  { value: "843", suffix: "M", label: "Projected cases by 2050", color: "#a0ffc3", countTo: 843 },
  { value: "$216", suffix: "B", label: "Global economic losses", color: "#ff9f43", countTo: 216 },
  { value: "#1", suffix: "", label: "Cause of disability worldwide", color: "#c3f5ff", countTo: null },
];

function CountUp({ value, countTo, suffix, color }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    if (countTo === null) {
      setDisplay(value);
      return;
    }
    const duration = 1.5;
    const isDecimal = countTo % 1 !== 0;
    const hasPrefix = value.startsWith("$");
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * countTo;
      const formatted = isDecimal ? current.toFixed(1) : Math.round(current).toString();
      setDisplay((hasPrefix ? "$" : "") + formatted);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [isInView, countTo, value]);

  return (
    <span ref={ref} style={{ color }}>
      {display}{suffix}
    </span>
  );
}

function TypewriterSource({ text, isInView }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    if (count >= text.length) return;
    const timer = setTimeout(() => setCount(c => c + 1), 30);
    return () => clearTimeout(timer);
  }, [isInView, count, text]);

  if (!isInView) return null;

  return (
    <span>
      {text.slice(0, count)}
      {count < text.length && (
        <span className="inline-block w-[1.5px] h-[0.8em] bg-[#c3f5ff]/40 ml-0.5 animate-pulse align-text-bottom" />
      )}
    </span>
  );
}

function StatCard({ value, suffix, label, color, countTo, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="text-center"
    >
      <div className="font-headline text-4xl md:text-5xl font-bold mb-2">
        <CountUp value={value} countTo={countTo} suffix={suffix} color={color} />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: delay + 0.3 }}
        className="font-headline text-[10px] uppercase tracking-[0.2em] text-[#bac9cc]"
      >
        {label}
      </motion.div>
    </motion.div>
  );
}

function StatsRow({ source, stats, regionTag }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref} className="mb-20 last:mb-0">
      {/* Region tag with animated line */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="flex items-center gap-3 mb-10"
      >
        <motion.span
          initial={{ scale: 0.8 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="font-headline text-[10px] uppercase tracking-[0.3em] text-[#c3f5ff]/50 font-bold border border-[#c3f5ff]/20 px-3 py-1 rounded-full"
        >
          {regionTag}
        </motion.span>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="h-px flex-1 bg-[#c3f5ff]/10 origin-left"
        />
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        {stats.map((stat, i) => (
          <StatCard key={stat.label} {...stat} delay={i * 0.2} />
        ))}
      </div>

      {/* Typing source */}
      <div className="mt-8 text-right h-5">
        <span className="font-headline text-[9px] uppercase tracking-wider text-[#c3f5ff]/30">
          <TypewriterSource text={source} isInView={isInView} />
        </span>
      </div>
    </div>
  );
}

export default function StatsScroll() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <StatsRow
        regionTag="United States"
        stats={usStats}
        source="Source: BLS ORS 2024, CDC NHIS, ACA, Georgetown HPI"
      />
      <StatsRow
        regionTag="Global"
        stats={globalStats}
        source="Source: The Lancet Rheumatology, GBD 2020, SJWEH"
      />
    </div>
  );
}
