"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

import { getPatients } from "@/lib/actions/patients"
import PatientList from "@/components/PatientList"
import { motion } from "framer-motion"
import { Activity, Shield, Zap, Heart, ArrowRight, Sparkles, Users, FileText, Star, CheckCircle, TrendingUp, Clock, Brain } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data, error } = await getPatients()
        if (error) {
          setError(error)
        } else {
          setPatients(data || [])
        }
      }
      setLoading(false)
    }
    
    checkUser()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
          </div>
          <p className="text-gray-600">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">⚠️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-red-600">Error loading patients</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <PatientList initialPatients={patients || []} />
      </div>
    </div>
  )
}

function LandingPage() {
  const features = [
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Bank-level encryption keeps your medical records safe and confidential",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Access patient information instantly with our optimized platform",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: Heart,
      title: "Patient-Centered",
      description: "Designed with care for better patient outcomes and experiences",
      color: "from-blue-500 to-orange-500"
    },
    {
      icon: Sparkles,
      title: "AI-Powered",
      description: "Smart features that help you work smarter, not harder",
      color: "from-orange-500 to-blue-600"
    }
  ]

  const stats = [
    { value: "10,000+", label: "Active Doctors", icon: Users },
    { value: "2.5M+", label: "Patient Records", icon: FileText },
    { value: "98%", label: "Time Saved", icon: Zap },
    { value: "4.9/5", label: "Doctor Rating", icon: Heart },
  ]

  const testimonials = [
    {
      name: "Dr. Sarah Chen",
      role: "Cardiologist, Stanford Medical",
      image: "👩‍⚕️",
      quote: "Cortex has transformed how I manage patient records. The AI assistant finds relevant information in seconds, saving me hours every day.",
      rating: 5
    },
    {
      name: "Dr. Michael Rodriguez",
      role: "Family Medicine, Mayo Clinic",
      image: "👨‍⚕️",
      quote: "The research mode is incredible. I can instantly access the latest medical studies while reviewing patient cases. It's like having a research assistant 24/7.",
      rating: 5
    },
    {
      name: "Dr. Emily Watson",
      role: "Pediatrician, Children's Hospital",
      image: "👩‍⚕️",
      quote: "I was skeptical about AI in healthcare, but Cortex proved me wrong. It's intuitive, secure, and genuinely helpful. My patients benefit from faster, more informed care.",
      rating: 5
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Navigation Bar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg shadow-sm"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-orange-500 shadow-md">
              <Activity className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">Cortex</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link href="/auth?mode=signin">
              <Button variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/auth?mode=signup">
              <Button size="sm" className="gap-2 shadow-md">
                Sign Up
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-blue-200 opacity-20 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute -right-20 top-40 h-96 w-96 rounded-full bg-orange-200 opacity-20 blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute bottom-20 left-1/2 h-64 w-64 rounded-full bg-blue-300 opacity-10 blur-3xl"
          />
        </div>

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-6 flex justify-center"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-orange-400 opacity-20 blur-xl"
                />
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-orange-500 shadow-lg"
                >
                  <Activity className="h-10 w-10 text-white" strokeWidth={2.5} />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-4"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                <Sparkles className="h-4 w-4" />
                Powered by Advanced AI
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl"
            >
              <span className="bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">
                Cortex
              </span>
              <br />
              <span className="text-4xl sm:text-5xl">Your Doctor's Second Brain</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-gray-600"
            >
              AI-powered medical records that think with you. Instant insights, 
              intelligent search, and research at your fingertips.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href="/auth">
                <Button size="lg" className="group gap-2 px-8 text-lg shadow-lg">
                  Get Started
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 text-lg">
                Watch Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Free & Open Source</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>HIPAA Compliant</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-3 flex justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-orange-500">
                    <stat.icon className="h-6 w-6 text-white" strokeWidth={2} />
                  </div>
                </div>
                <motion.div
                  initial={{ scale: 0.5 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                  className="mb-1 text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm font-medium text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            Why Choose Cortex?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Everything you need to manage medical records efficiently and securely
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-5"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${
                    feature.color.includes('blue') ? '#3b82f6' : '#f97316'
                  }, ${
                    feature.color.includes('orange') ? '#fb923c' : '#60a5fa'
                  })`
                }}
              />
              <div className="relative">
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                  <feature.icon className="h-7 w-7 text-white" strokeWidth={2} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="relative bg-gradient-to-br from-gray-50 to-blue-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Trusted by Healthcare Professionals
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              See what doctors are saying about Cortex
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="mb-4 flex items-center gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-6 text-gray-700 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-orange-500 text-2xl">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-600">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-4xl font-bold text-gray-900">
            How Cortex Works
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Three simple steps to transform your practice
          </p>
        </motion.div>

        <div className="grid gap-12 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Upload Records",
              description: "Securely upload patient files, images, and documents. Our AI automatically indexes everything.",
              icon: FileText,
              color: "from-blue-500 to-blue-600"
            },
            {
              step: "2",
              title: "Ask Questions",
              description: "Chat with your AI assistant to instantly find information across all patient records.",
              icon: Brain,
              color: "from-orange-500 to-orange-600"
            },
            {
              step: "3",
              title: "Get Insights",
              description: "Receive intelligent answers with citations, plus access to the latest medical research.",
              icon: TrendingUp,
              color: "from-blue-500 to-orange-500"
            }
          ].map((item, index) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.15 + 0.2, type: "spring" }}
                className="mb-6 flex justify-center"
              >
                <div className="relative">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${item.color} shadow-lg`}>
                    <item.icon className="h-10 w-10 text-white" strokeWidth={2} />
                  </div>
                  <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200 font-bold text-gray-900">
                    {item.step}
                  </div>
                </div>
              </motion.div>
              <h3 className="mb-3 text-xl font-bold text-gray-900">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-orange-500 px-8 py-20 shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
          <div className="relative text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-6 flex justify-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                Built for Healthcare Professionals
              </div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 text-4xl font-bold text-white sm:text-5xl"
            >
              Ready to Transform Your Practice?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mx-auto mb-8 max-w-2xl text-xl text-blue-50"
            >
              Join thousands of doctors using AI-powered medical records management
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Link href="/auth">
                <Button
                  size="lg"
                  className="group gap-2 bg-white px-10 text-lg text-blue-600 hover:bg-blue-50 shadow-2xl"
                >
                  Get Started Now
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-6 text-sm text-blue-100"
            >
              Free & Open Source • HIPAA Compliant • Secure by Design
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
