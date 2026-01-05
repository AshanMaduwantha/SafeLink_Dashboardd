"use client";

import React from "react";
import Link from "next/link";

const UnauthorizedPage = () => {
  return (
    <div className="flex min-h-full flex-col bg-white pb-12 pt-16">
      <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-shrink-0 justify-center">
          <Link href="/" className="inline-flex">
            <span className="sr-only">StudioMate</span>
            <img
              className="h-20 w-auto"
              src="./login.png"
              alt="StudioMate Logo"
            />
          </Link>
        </div>
        <div className="py-16">
          <div className="text-center">
            <p className="text-base font-semibold text-indigo-600">403</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Access Denied
            </h1>
            <p className="mt-2 text-base text-gray-500">
              You do not have permission to access this page.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="text-base font-medium text-indigo-600 hover:text-indigo-500"
              >
                Go back to Dashboard
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UnauthorizedPage;
