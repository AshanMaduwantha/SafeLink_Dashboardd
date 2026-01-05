import Dashboard from "@/components/dashboard/Dashboard";

export default function Page() {
  return (
    <div>
      <Dashboard />
      <div className="fixed bottom-4 right-4">
        <button className="flex items-center gap-x-2 rounded-full bg-blue-600 px-4 py-2 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <img
            src="https://doctor-on-call-main.s3.ap-southeast-2.amazonaws.com/public/icon/question.png"
            alt=""
          />
          User Support
        </button>
      </div>
    </div>
  );
}
