import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { BookOpenIcon, XMarkIcon, UserIcon } from "@heroicons/react/24/outline";
import { Class } from "@/types/classes";

interface ClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: Class[];
  packName?: string;
}

export default function ClassesModal({
  isOpen,
  onClose,
  classes,
  packName,
}: ClassesModalProps) {
  const sortedClasses = [...classes].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

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
              <Dialog.Panel className="w-full max-w-6xl h-[80vh] transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all flex flex-col">
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="flex items-center gap-2 text-lg font-bold leading-6 text-gray-900"
                  >
                    <BookOpenIcon className="h-5 w-5 text-blue-600" />
                    {packName ? `${packName} · Classes` : "Classes"}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="cursor-pointer rounded-md p-1 text-gray-400 hover:text-gray-600 hover:bg-red-100 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5 hover:text-red-500" />
                  </button>
                </div>

                <div className="mt-6 flex-1">
                  {sortedClasses.length > 0 ? (
                    <div className="flex gap-4 h-full">
                      <div className="flex-1 flex flex-col gap-4">
                        {sortedClasses
                          .filter((_, index) => index % 2 === 0)
                          .map((cls, index) => (
                            <div
                              key={cls.id || index * 2}
                              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors"
                            >
                              <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                              <div className="flex flex-grow justify-between items-center">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium text-gray-900">
                                    {cls.name}
                                  </p>
                                  {cls.instructor && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <UserIcon className="h-3 w-3" />{" "}
                                      {cls.instructor}
                                    </p>
                                  )}
                                </div>
                                {typeof cls.price === "number" && (
                                  <p className="text-sm text-gray-600 font-medium">
                                    ${cls.price?.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                      <div className="flex-1 flex flex-col gap-4">
                        {sortedClasses
                          .filter((_, index) => index % 2 === 1)
                          .map((cls, index) => (
                            <div
                              key={cls.id || index * 2 + 1}
                              className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 hover:bg-blue-100 transition-colors"
                            >
                              <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                              <div className="flex flex-grow justify-between items-center">
                                <div className="flex flex-col">
                                  <p className="text-sm font-medium text-gray-900">
                                    {cls.name}
                                  </p>
                                  {cls.instructor && (
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <UserIcon className="h-3 w-3" />{" "}
                                      {cls.instructor}
                                    </p>
                                  )}
                                </div>
                                {typeof cls.price === "number" && (
                                  <p className="text-sm text-gray-600 font-medium">
                                    ${cls.price?.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-center text-gray-500 text-lg">
                        No classes available.
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
}
