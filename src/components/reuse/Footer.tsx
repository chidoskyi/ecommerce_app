"use client";

import Container from "@/components/reuse/Container";
import { Facebook, Twitter, Instagram, MessageSquare } from "lucide-react";

import React from "react";
import { categoriesData } from "../../data/categories";
import Link from "next/link";

function Footer() {
  return (
    // <div className=''>÷
    <footer className="bg-white border-t border-gray-200 pt-12 pb-20 md:pb-12">
      <Container>
        <div className="mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Logo */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">f</span>
                </div>
                <span className="text-xl font-bold text-gray-900">eedMe</span>
              </div>
              <p className="text-gray-600 text-sm">Real Food. Real Fast.</p>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">CATEGORIES</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {categoriesData.map((category, index) => (
                  <li key={index}>
                    <Link
                      href={`/category/${category.slug}`}
                      className="hover:text-orange-600"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>


            {/* Company */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">COMPANY</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-green-600">
                    Community
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-green-600">
                    Career
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-green-600">
                    Press Releases
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-green-600">
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>

            {/* Get Help */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">GET HELP</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a href="#" className="hover:text-green-600">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-green-600">
                    Send An Email
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-green-600">
                    Account & Logistics
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-bold text-gray-900 mb-4">LEGAL</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {/* <li>
                  <a href="#" className="hover:text-green-600">
                    Terms
                  </a>
                </li> */}
                <li>
                  <a href="/privacy-policy" className="hover:text-green-600">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between pb-0">
            <p className="text-center text-sm text-gray-500 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} Francis Online Store. All rights
              reserved.
            </p>
            <div className="flex items-center justify-center w-full md:w-auto gap-[3rem] md:gap-5">
              <a
                href="#"
                aria-label="Facebook"
                className="text-gray-400 hover:text-orange-600 transition-colors"
              >
                <Facebook className="w-6 h-6" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="text-gray-400 hover:text-orange-600 transition-colors"
              >
                <Twitter className="w-6 h-6" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="text-gray-400 hover:text-orange-600 transition-colors"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a
                href="#"
                aria-label="WhatsApp"
                className="text-gray-400 hover:text-orange-600 transition-colors"
              >
                <MessageSquare className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>

    // </div>
  );
}

export default Footer;
