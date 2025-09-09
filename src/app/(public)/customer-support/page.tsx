"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  Phone,
  Mail,
  HelpCircle,
} from "lucide-react";
import Container from "@/components/reuse/Container";
import Breadcrumb from "@/components/reuse/Breadcrumb";
import axios from "axios";
import { AxiosError } from "axios";

const CustomerSupportPage = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const faqItems = [
    {
      question: "How do I track my order?",
      answer:
        "This is where the answer would be displayed. You can customize this content based on your specific FAQ answers.",
    },
    {
      question: "What is your return policy?",
      answer:
        "This is where the answer would be displayed. You can customize this content based on your specific FAQ answers.",
    },
    {
      question: "How long does shipping take?",
      answer:
        "This is where the answer  would be displayed. You can customize this content based on your specific FAQ answers.",
    },
    {
      question: "Do you offer international shipping?",
      answer:
        "This is where the answer  would be displayed. You can customize this content based on your specific FAQ answers.",
    },
    {
      question: "How can I contact seller directly?",
      answer:
        "This is where the answer  would be displayed. You can customize this content based on your specific FAQ answers.",
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await axios.post('/api/contact', formData);
      
      if (response.data.success) {
        setSubmitStatus({
          success: true,
          message: response.data.message,
        });
        // Reset form
        setFormData({
          fullName: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        setSubmitStatus({
          success: false,
          message: response.data.message,
          errors: response.data.data?.errors,
        });
      }
    } catch (error) {
      const err = error as AxiosError<{ message?: string; data?: { errors?: unknown } }>;
      console.error("Form submission error:", err);
    
      setSubmitStatus({
        success: false,
        message:
          err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred. Please try again.",
        errors: Array.isArray(err.response?.data?.data?.errors)
          ? (err.response?.data?.data?.errors as string[])
          : undefined,
      });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Main Content */}
      <Container className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Customer Service
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We&apos;re here to help you with any questions or concerns you may have
            about your orders or our services.
          </p>
        </div>

        {/* Support Options */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Phone Support */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-3 rounded-full mr-4">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Phone Support</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Speak directly with our support team
            </p>
            <div className="text-lg font-semibold text-gray-800 mb-2">
              +234 704 642 8747
            </div>
            <div className="text-sm text-gray-500">
              ⏱ Mon-Fri: 8am-6pm, Sat: 9am-4pm
            </div>
          </div>

          {/* Email Support */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold">Email Support</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Send us an email and we&apos;ll respond promptly
            </p>
            <div className="text-lg font-semibold text-gray-800 mb-2">
              seedspikelimited@gmail.com
            </div>
            <div className="text-sm text-gray-500">
              Average response time: 12 hours
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-12">
          <div className="flex items-center mb-6">
            <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white text-sm"><HelpCircle /></span>
            </div>
            <h2 className="text-2xl font-semibold">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-2">
            {faqItems.map((question, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center text-lg cursor-pointer justify-between p-4 text-left hover:bg-gray-50 transition-colors duration-200"
                >
                  <span className="font-medium">{question.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                      expandedFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`px-4 overflow-hidden transition-all duration-300 ease-in-out ${
                    expandedFaq === index ? "max-h-[500px] pb-4" : "max-h-0"
                  }`}
                >
                  <p className="text-gray-600 px-4">{question.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Contact Us
          </h2>

          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Your name"
                  value={formData.fullName}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                placeholder="What's this about?"
                value={formData.subject}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                name="message"
                rows={5}
                placeholder="How can we help you?"
                value={formData.message}
                onChange={handleFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>

            {submitStatus && (
              <div className={`mb-4 p-4 rounded-lg ${
                submitStatus.success 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <p className="font-medium">{submitStatus.message}</p>
                {submitStatus.errors && (
                  <ul className="list-disc pl-5 mt-2">
                    {submitStatus.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="text-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`bg-orange-600 cursor-pointer text-white px-8 py-3 rounded-lg font-medium hover:bg-orange-700 transition-colors ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
};

export default CustomerSupportPage;