"use client";

import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { AcademicCapIcon } from "@heroicons/react/24/solid";

export interface EnrolledClassDetail {
  id: string;
  name: string;
  color: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface EnrolledClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrolledClasses: EnrolledClassDetail[];
}

const EnrolledClassesModal: React.FC<EnrolledClassesModalProps> = ({
  isOpen,
  onClose,
  enrolledClasses,
}) => {
  // Sort enrolled classes by proximity to today (today first, then tomorrow, etc.)
  const sortedEnrolledClasses = [...enrolledClasses].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day

    const dateA = new Date(a.date);
    dateA.setHours(0, 0, 0, 0);

    const dateB = new Date(b.date);
    dateB.setHours(0, 0, 0, 0);

    // Calculate days difference from today
    const diffA = Math.floor(
      (dateA.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const diffB = Math.floor(
      (dateB.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Today (diff = 0) comes first, then tomorrow (diff = 1), etc.
    return diffA - diffB;
  });

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-6xl h-[90vh] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col">
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="flex items-center gap-2 text-lg font-bold leading-6 text-gray-900"
                  >
                    <AcademicCapIcon className="h-5 w-5 text-blue-600" />
                    Enrolled Classes
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="cursor-pointer rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-red-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 hover:text-red-500" />
                  </button>
                </div>

                <div className="mt-6 flex-1">
                  {sortedEnrolledClasses.length > 0 ? (
                    <div className="flex gap-4 h-full">
                      {/* Left Column */}
                      <div className="flex-1 flex flex-col gap-4">
                        {sortedEnrolledClasses
                          .filter((_, _index) => _index % 2 === 0)
                          .map((cls, _index) => (
                            <div
                              key={cls.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors"
                            >
                              <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                              <div className="flex flex-grow items-center">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium text-gray-800">
                                    {cls.name}
                                  </p>
                                  {cls.date && (
                                    <p className="text-xs text-gray-500">
                                      {new Date(cls.date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Right Column */}
                      <div className="flex-1 flex flex-col gap-4">
                        {sortedEnrolledClasses
                          .filter((_, _index) => _index % 2 === 1)
                          .map((cls, _index) => (
                            <div
                              key={cls.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors"
                            >
                              <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                              <div className="flex flex-grow items-center">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium text-gray-800">
                                    {cls.name}
                                  </p>
                                  {cls.date && (
                                    <p className="text-xs text-gray-500">
                                      {new Date(cls.date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-center text-gray-500 text-lg">
                        No enrolled classes found.
                      </p>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EnrolledClassesModal;
