"use client";
import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const blogs = [
  {
    href: "/blog/1",
    image: "/exercises/Image1.png",
    date: "March 20, 2026",
    readTime: "4 min read",
    title: "Why Your Posture Gets Worse After Lunch",
    description: "Most people notice it around 2pm. The slouch creeps in, the neck drifts forward, and the shoulders round.",
    author: "Sarath",
    authorInitial: "S",
    authorColor: "#c3f5ff",
  },
  {
    href: "/blog/2",
    image: "/exercises/Image2.png",
    date: "March 21, 2026",
    readTime: "5 min read",
    title: "The Science Behind Posture Scoring",
    description: "Generic posture standards don't account for individual variation. PostureGuard takes a different approach.",
    author: "Ashish",
    authorInitial: "A",
    authorColor: "#ff9f43",
  },
  {
    href: "/blog/3",
    image: "/exercises/Image3.png",
    date: "March 22, 2026",
    readTime: "4 min read",
    title: "How AI Is Reshaping Ergonomic Health",
    description: "The ergonomics industry has relied on hardware for decades. AI changes this equation entirely.",
    author: "Sarath",
    authorInitial: "S",
    authorColor: "#c3f5ff",
  },
];

export default function BlogCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {blogs.map((blog, i) => (
        <motion.div
          key={blog.href}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <Link href={blog.href} className="group block">
            {/* Image */}
            <motion.div
              className="relative w-full h-56 rounded-xl overflow-hidden mb-5"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <Image
                src={blog.image}
                alt={blog.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#131313]/60 to-transparent" />
            </motion.div>

            {/* Author + date */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: `${blog.authorColor}20`, color: blog.authorColor }}
              >
                {blog.authorInitial}
              </div>
              <span className="font-headline text-xs text-[#bac9cc]/60">{blog.author}</span>
              <span className="text-[#bac9cc]/30 text-xs">·</span>
              <span className="font-headline text-[10px] text-[#bac9cc]/40">{blog.date}</span>
            </div>

            {/* Title */}
            <h3 className="font-headline text-lg font-bold text-[#e5e2e1] mb-2 tracking-tight group-hover:text-[#c3f5ff] transition-colors leading-snug">
              {blog.title}
            </h3>

            {/* Description */}
            <p className="font-body text-[#bac9cc]/70 text-sm font-light leading-relaxed mb-4">
              {blog.description}
            </p>

            {/* Read more */}
            <span className="font-headline text-[10px] uppercase tracking-widest text-[#c3f5ff]/50 group-hover:text-[#c3f5ff] transition-colors">
              Read Article →
            </span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
