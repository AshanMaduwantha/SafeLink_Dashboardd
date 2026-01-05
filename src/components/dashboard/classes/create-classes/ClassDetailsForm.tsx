"use client";

import React, {
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import {
  classDetailsSchema,
  ClassDetailsFormValues,
} from "@/lib/validations/classes/create-classes/ClassDetalis.schema";

export interface ClassDetailsFormRef {
  triggerValidation: () => Promise<boolean>;
  getValues: () => ClassDetailsFormValues;
  saveToDatabase: () => Promise<string | null>;
}

interface ClassDetailsFormProps {
  onLoadingChange?: (loading: boolean) => void;
}

const ClassDetailsForm = forwardRef<ClassDetailsFormRef, ClassDetailsFormProps>(
  ({ onLoadingChange }, ref) => {
    const searchParams = useSearchParams();
    const [classId, setClassId] = useState<string | null>(null);

    const {
      register,
      handleSubmit,
      trigger,
      getValues,
      setValue,
      clearErrors,
      formState: { errors },
    } = useForm<ClassDetailsFormValues>({
      resolver: zodResolver(classDetailsSchema),
      mode: "onChange",
    });

    useEffect(() => {
      const urlClassId = searchParams.get("classId");
      if (urlClassId && urlClassId !== classId) {
        loadClassData(urlClassId);
      }
    }, [searchParams, classId]);

    const loadClassData = async (id: string) => {
      try {
        onLoadingChange?.(true);
        const response = await fetch(`/api/classes/draft?id=${id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.class) {
            setClassId(data.class.id);
            setValue("className", data.class.className);
            setValue("description", data.class.description);
            setValue("instructorName", data.class.instructorName);
          }
        }
      } catch (error) {
        console.error("Error loading class data:", error);
      } finally {
        onLoadingChange?.(false);
      }
    };

    const saveToDatabase = async (): Promise<string | null> => {
      try {
        const formData = getValues();

        if (classId) {
          const response = await fetch("/api/classes/draft", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...formData,
              classId: classId,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.class) {
              return data.class.id;
            }
          }
        } else {
          const response = await fetch("/api/classes/draft", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...formData,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.class) {
              const newClassId = data.class.id;
              setClassId(newClassId);
              return newClassId;
            }
          }
        }
        return null;
      } catch (error) {
        console.error("Error saving class data:", error);
        return null;
      }
    };

    useImperativeHandle(ref, () => ({
      triggerValidation: async () => {
        const isValid = await trigger();
        return isValid;
      },
      getValues: () => getValues(),
      saveToDatabase: saveToDatabase,
    }));

    const registerWithValidation = (
      fieldName: keyof ClassDetailsFormValues,
    ) => {
      return {
        ...register(fieldName, {
          onChange: async () => {
            if (errors[fieldName]) {
              clearErrors(fieldName);
            }
            await trigger(fieldName);
          },
        }),
      };
    };
    const onSubmit: SubmitHandler<ClassDetailsFormValues> = (data) => {
      console.warn("Class Details Form Data:", data);
    };

    return (
      <div className="w-full p-3 sm:p-6 bg-white rounded-lg">
        <div className="text-center mb-6 sm:mb-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-800">
            Class Details
          </h3>
          <p className="text-gray-500 text-sm mt-2">
            Basic Information about the class
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="className"
              className="block text-sm font-medium text-gray-700"
            >
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="className"
              {...registerWithValidation("className")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter class name"
            />
            {errors.className && (
              <p className="mt-2 text-sm text-red-600">
                {errors.className.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              {...registerWithValidation("description")}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter description"
            ></textarea>
            {errors.description && (
              <p className="mt-2 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="instructorName"
              className="block text-sm font-medium text-gray-700"
            >
              Instructor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="instructorName"
              {...registerWithValidation("instructorName")}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Enter instructor name"
            />
            {errors.instructorName && (
              <p className="mt-2 text-sm text-red-600">
                {errors.instructorName.message}
              </p>
            )}
          </div>
        </form>
      </div>
    );
  },
);

ClassDetailsForm.displayName = "ClassDetailsForm";

export default ClassDetailsForm;
