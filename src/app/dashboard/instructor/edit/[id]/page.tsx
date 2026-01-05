import AddInstructor from "@/components/dashboard/instructor/AddInstructor";
import React from "react";

async function EditInstructorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <AddInstructor instructorId={id} />
    </div>
  );
}

export default EditInstructorPage;
