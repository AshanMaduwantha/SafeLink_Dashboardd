import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BookOpenIcon } from "@heroicons/react/24/outline";
import { Class } from "@/types/classes";

interface InstructorClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructorName: string;
  classes: Class[];
}

const InstructorClassesModal: React.FC<InstructorClassesModalProps> = ({
  isOpen,
  onClose,
  instructorName,
  classes,
}) => {
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
                    <BookOpenIcon className="h-5 w-5 text-blue-600" />
                    Classes Taught by {instructorName}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="cursor-pointer rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-red-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 hover:text-red-500" />
                  </button>
                </div>

                <div className="mt-6 flex-1 overflow-y-auto">
                  {classes.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-center text-gray-500 text-lg">
                        No classes assigned to this instructor.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-4 h-full">
                      {/* Left Column */}
                      <div className="flex-1 flex flex-col gap-4">
                        {classes
                          .filter((_, index) => index % 2 === 0)
                          .map((classItem, index) => (
                            <div
                              key={index * 2}
                              className="flex flex-col gap-2 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors"
                            >
                              <h4 className="text-sm font-medium text-gray-900">
                                {classItem.name}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {classItem.description}
                              </p>
                            </div>
                          ))}
                      </div>

                      {/* Right Column */}
                      <div className="flex-1 flex flex-col gap-4">
                        {classes
                          .filter((_, index) => index % 2 === 1)
                          .map((classItem, index) => (
                            <div
                              key={index * 2 + 1}
                              className="flex flex-col gap-2 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors"
                            >
                              <h4 className="text-sm font-medium text-gray-900">
                                {classItem.name}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {classItem.description}
                              </p>
                            </div>
                          ))}
                      </div>
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

export default InstructorClassesModal;
