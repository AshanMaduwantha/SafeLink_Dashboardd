"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const [totalActiveClasses, setTotalActiveClasses] = useState<number | null>(
    null,
  );
  const [totalEnrolledClasses, setTotalEnrolledClasses] = useState<
    number | null
  >(null);
  const [_totalCompletedClasses, setTotalCompletedClasses] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassCounts = async () => {
      try {
        const activeClassesResponse = await fetch(
          "/api/classes?limit=1&status=all",
        );
        if (!activeClassesResponse.ok) {
          throw new Error(
            `HTTP error! status: ${activeClassesResponse.status}`,
          );
        }
        const activeClassesData = await activeClassesResponse.json();
        setTotalActiveClasses(activeClassesData.totalActiveClasses);
        setTotalCompletedClasses(activeClassesData.totalCompletedClasses);

        const enrolledClassesResponse = await fetch("/api/classes/enrolled");
        if (!enrolledClassesResponse.ok) {
          throw new Error(
            `HTTP error! status: ${enrolledClassesResponse.status}`,
          );
        }
        const enrolledClassesData = await enrolledClassesResponse.json();
        setTotalEnrolledClasses(enrolledClassesData.totalEnrolledClasses);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching class counts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassCounts();
  }, []);

  const handleViewAllClasses = () => {
    router.push("/dashboard/classes");
  };

  return (
    <div className=" min-h-screen ">
      <div className=" mx-auto">
        {/* Dashboard Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Total Active Classes */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center space-x-4">
                <div className="bg-[#0073FF] p-3 rounded-lg">
                  <img
                    src="https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/icon/people.png"
                    alt="Total Active Classes Icon"
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Active Classes</p>
                  {loading ? (
                    <p className="text-2xl font-semibold text-gray-900">
                      Loading...
                    </p>
                  ) : error ? (
                    <p className="text-2xl font-semibold text-red-500">Error</p>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-900">
                      {totalActiveClasses}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <p
                className="text-blue-600 text-sm cursor-pointer"
                onClick={handleViewAllClasses}
              >
                View all
              </p>
            </div>
          </div>

          {/* Card 2: Total Completed Classes */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center space-x-4">
                <div className="bg-[#0073FF] p-3 rounded-lg">
                  <img
                    src="https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/icon/people.png"
                    alt="Total Completed Classes Icon"
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Class Enrollment</p>
                  {loading ? (
                    <p className="text-2xl font-semibold text-gray-900">
                      Loading...
                    </p>
                  ) : error ? (
                    <p className="text-2xl font-semibold text-red-500">Error</p>
                  ) : (
                    <p className="text-2xl font-semibold text-gray-900">
                      {totalEnrolledClasses}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <p
                className="text-blue-600 text-sm cursor-pointer"
                onClick={() =>
                  router.push("/dashboard/classes/enrolled-classes")
                }
              >
                View all
              </p>
            </div>
          </div>

          {/* Card 3: Total Sales */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center space-x-4">
                <div className="bg-[#0073FF] p-3 rounded-lg">
                  <img
                    src="https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/icon/people.png"
                    alt="Total Sales Icon"
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Sales</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    $171,897{" "}
                    <span className="text-green-500 text-base">↑ 122</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <p className="text-blue-600 text-sm cursor-pointer">View all</p>
            </div>
          </div>

          {/* Card 4: Total Earnings */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 pb-4">
              <div className="flex items-center space-x-4">
                <div className="bg-[#0073FF] p-3 rounded-lg">
                  <img
                    src="https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/icon/people.png"
                    alt="Total Earnings Icon"
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <p className="text-gray-500 text-sm">Total Earnings</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    $71,897{" "}
                    <span className="text-green-500 text-base">↑ 122</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <p className="text-blue-600 text-sm cursor-pointer">View all</p>
            </div>
          </div>
        </div>

        {/* Earnings Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Earnings</h2>
            <div className="relative">
              <select className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline text-sm">
                <option>This Year</option>
                <option>Last Year</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Jan", earnings: 50000 },
                  { name: "Feb", earnings: 65000 },
                  { name: "Mar", earnings: 72000 },
                  { name: "Apr", earnings: 60000 },
                  { name: "May", earnings: 45000 },
                  { name: "Jun", earnings: 58000 },
                  { name: "Jul", earnings: 65000 },
                  { name: "Aug", earnings: 77000 },
                  { name: "Sep", earnings: 68000 },
                  { name: "Oct", earnings: 58000 },
                  { name: "Nov", earnings: 48000 },
                  { name: "Dec", earnings: 75000 },
                ]}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(value) => `$${value / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value}`, "Earnings"]}
                  cursor={{ fill: "transparent" }}
                />
                <Bar
                  dataKey="earnings"
                  fill="#0073FF"
                  barSize={60}
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
