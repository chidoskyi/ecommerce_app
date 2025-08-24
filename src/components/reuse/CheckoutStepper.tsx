// components/checkout/CheckoutStepper.tsx
"use client";

import React from "react";
import { Check } from "lucide-react";
import { CheckoutStepperProps } from "@/types/checkout";



const CheckoutStepper: React.FC<CheckoutStepperProps> = ({
  currentStep,
  steps,
  children,
}) => {
  return (
    <div className="relative">
      {steps.map((stepTitle, index) => {
        const stepNumber = index + 1;
        return (
          <div
            key={stepNumber}
            className={`relative flex flex-col ${
              index < steps.length - 1 ? "pb-8" : ""
            }`}
          >
            {/* Connector Line - Always present except for last step */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-6 top-12 w-0.5 h-full transition-all duration-200 ${
                  stepNumber < currentStep ? "bg-orange-600" : "bg-gray-300"
                }`}
                style={{ height: "calc(100% - 3rem)" }}
              />
            )}

            {/* Step Header */}
            <div className="flex items-center relative z-10">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-200 ${
                  stepNumber < currentStep
                    ? "bg-orange-600 text-white"
                    : stepNumber === currentStep
                    ? "bg-orange-600 text-white border-2 border-orange-600"
                    : "bg-gray-300 text-gray-500"
                }`}
              >
                {stepNumber < currentStep ? (
                  <Check className="w-6 h-6" />
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={`ml-4 font-medium text-lg transition-all duration-200 ${
                  stepNumber <= currentStep ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {stepTitle}
              </span>
            </div>

            {/* Step Content - Show only for current step */}
            {stepNumber === currentStep && (
              <div className="ml-10 mt-6">
                {children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CheckoutStepper;