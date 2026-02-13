"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createJob,
  saveRoleIntake,
  suggestRoleIntake,
  type LanguageLevel,
  type RoleIntakePayload,
} from "@/lib/jobs";
import { cn } from "@/lib/utils";

const seniorityOptions = ["intern", "junior", "mid", "senior", "lead", "principal"] as const;
const roleCategoryOptions = [
  "engineering",
  "data",
  "product",
  "design",
  "operations",
  "marketing",
  "sales",
  "finance",
  "other",
] as const;
const employmentTypeOptions = ["full_time", "part_time", "contract", "temporary", "internship"] as const;
const workModeOptions = ["remote", "hybrid", "onsite"] as const;
const locationStrictnessOptions = ["hard_filter", "soft_preference"] as const;
const scoringPresetOptions = ["strict", "balanced", "exploratory", "skills_first", "exp_first"] as const;
const languageLevels: LanguageLevel[] = ["basic", "conversational", "professional", "native"];

const intakeSchema = z.object({
  role_title: z.string().min(2),
  job_description: z.string().default(""),
  seniority: z.enum(seniorityOptions),
  role_category: z.enum(roleCategoryOptions),
  employment_type: z.enum(employmentTypeOptions),
  work_mode: z.enum(workModeOptions),
  allowed_cities: z.array(z.string()),
  allowed_countries: z.array(z.string()),
  relocation_accepted: z.boolean(),
  location_strictness: z.enum(locationStrictnessOptions),

  must_have_technical_skills: z.array(z.string()),
  must_have_frameworks: z.array(z.string()),
  must_have_tools: z.array(z.string()),
  nice_to_have_skills: z.array(z.string()),
  nice_to_have_frameworks: z.array(z.string()),
  nice_to_have_tools: z.array(z.string()),
  soft_skills_required: z.array(z.string()),
  soft_skills_preferred: z.array(z.string()),
  min_years_experience: z.number().min(0).max(30),
  domain_experience: z.array(z.string()),
  career_stability_rule: z.boolean(),

  required_languages: z.array(
    z.object({
      language: z.string().min(1),
      level: z.enum(["basic", "conversational", "professional", "native"]),
    })
  ),
  education_requirement: z.string(),
  keywords_boost: z.array(z.string()),
  keywords_penalize: z.array(z.string()),
  scoring_preset: z.enum(scoringPresetOptions),
  hard_filter_toggles: z.object({
    reject_if_missing_must_have: z.boolean(),
    reject_if_location_mismatch: z.boolean(),
    reject_if_min_exp_not_met: z.boolean(),
    reject_if_missing_language: z.boolean(),
  }),
});

type IntakeFormValues = z.infer<typeof intakeSchema>;
type StringArrayField =
  | "allowed_cities"
  | "allowed_countries"
  | "must_have_technical_skills"
  | "must_have_frameworks"
  | "must_have_tools"
  | "nice_to_have_skills"
  | "nice_to_have_frameworks"
  | "nice_to_have_tools"
  | "soft_skills_required"
  | "soft_skills_preferred"
  | "domain_experience"
  | "keywords_boost"
  | "keywords_penalize";

const stepLabels = ["Role + Location", "Skills + Experience", "Languages + Scoring"] as const;

function ChipsInput({
  label,
  values,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2">
        {values.map((value) => (
          <Badge key={`${label}-${value}`} variant="secondary" className="gap-1">
            {value}
            <button type="button" className="text-muted-foreground" onClick={() => onRemove(value)}>
              ×
            </button>
          </Badge>
        ))}
        <input
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && inputValue.trim()) {
              event.preventDefault();
              onAdd(inputValue.trim());
              setInputValue("");
            }
          }}
          placeholder={placeholder}
          className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}

export default function NewJobPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      role_title: "",
      job_description: "",
      seniority: "senior",
      role_category: "engineering",
      employment_type: "full_time",
      work_mode: "hybrid",
      allowed_cities: [],
      allowed_countries: [],
      relocation_accepted: false,
      location_strictness: "soft_preference",
      must_have_technical_skills: [],
      must_have_frameworks: [],
      must_have_tools: [],
      nice_to_have_skills: [],
      nice_to_have_frameworks: [],
      nice_to_have_tools: [],
      soft_skills_required: [],
      soft_skills_preferred: [],
      min_years_experience: 4,
      domain_experience: [],
      career_stability_rule: false,
      required_languages: [],
      education_requirement: "",
      keywords_boost: [],
      keywords_penalize: [],
      scoring_preset: "balanced",
      hard_filter_toggles: {
        reject_if_missing_must_have: true,
        reject_if_location_mismatch: false,
        reject_if_min_exp_not_met: true,
        reject_if_missing_language: false,
      },
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  const values = form.watch();

  const stepFields: (keyof IntakeFormValues)[][] = useMemo(
    () => [
      [
        "role_title",
        "seniority",
        "role_category",
        "employment_type",
        "work_mode",
        "allowed_cities",
        "allowed_countries",
      ],
      [
        "must_have_technical_skills",
        "must_have_frameworks",
        "must_have_tools",
        "nice_to_have_skills",
        "nice_to_have_frameworks",
        "nice_to_have_tools",
        "min_years_experience",
      ],
      ["required_languages", "scoring_preset", "hard_filter_toggles"],
    ],
    []
  );

  const updateChip = (field: StringArrayField, nextValue: string, op: "add" | "remove") => {
    const current = form.getValues(field);
    if (!Array.isArray(current)) return;

    if (op === "add") {
      if (current.includes(nextValue)) return;
      form.setValue(field, [...current, nextValue] as never, { shouldValidate: true });
    } else {
      form.setValue(
        field,
        current.filter((value) => value !== nextValue) as never,
        { shouldValidate: true }
      );
    }
  };

  const onSuggestFromJd = async () => {
    const roleTitle = form.getValues("role_title");
    const jd = form.getValues("job_description");

    if (!roleTitle.trim() || jd.trim().length < 20) {
      toast.error("Add role title and a longer job description first.");
      return;
    }

    try {
      setIsSuggesting(true);
      const response = await suggestRoleIntake({
        role_title: roleTitle,
        job_description: jd,
      });

      const suggestion = response.suggestion;
      for (const [key, value] of Object.entries(suggestion)) {
        form.setValue(key as keyof IntakeFormValues, value as never);
      }

      toast.success("Criteria suggested", {
        description: "Review and adjust before creating the job.",
      });
    } catch {
      toast.error("Unable to suggest criteria right now.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const onNextStep = async () => {
    const valid = await form.trigger(stepFields[step]);
    if (!valid) return;
    setStep((previous) => Math.min(2, previous + 1));
  };

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      setIsSubmitting(true);

      const job = await createJob({
        name: data.role_title,
        description: data.job_description || null,
      });

      const payload: RoleIntakePayload = {
        ...data,
        education_requirement: data.education_requirement || null,
      };

      await saveRoleIntake(job.id, payload);

      toast.success("Job intake completed", {
        description: "Structured criteria saved and ready for shortlist.",
      });
      router.push(`/jobs/${job.id}?tab=upload`);
    } catch {
      toast.error("Unable to create job intake", {
        description: "Please review inputs and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <AppShell title="Create Job" subtitle="Structured intake wizard to drive deterministic shortlisting.">
      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {stepLabels.map((label, index) => {
            const active = step === index;
            const complete = step > index;
            return (
              <button
                key={label}
                type="button"
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm",
                  active && "border-primary bg-primary/10",
                  complete && "border-emerald-500/40"
                )}
                onClick={() => setStep(index)}
              >
                <p className="font-medium">Step {index + 1}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </button>
            );
          })}
        </div>

        <Card className="border-border/80">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Job Intake Wizard</CardTitle>
              <CardDescription>
                Collect structured criteria so ranking stays explainable and reproducible.
              </CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={onSuggestFromJd} disabled={isSuggesting}>
              {isSuggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Suggest from JD
            </Button>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={onSubmit}>
              {step === 0 ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Role title</Label>
                      <Input {...form.register("role_title")} placeholder="Senior Frontend Engineer" />
                    </div>
                    <div className="space-y-2">
                      <Label>Seniority</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={values.seniority}
                        onChange={(event) => form.setValue("seniority", event.target.value as IntakeFormValues["seniority"])}
                      >
                        {seniorityOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Role category</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={values.role_category}
                        onChange={(event) => form.setValue("role_category", event.target.value as IntakeFormValues["role_category"])}
                      >
                        {roleCategoryOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Employment type</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={values.employment_type}
                        onChange={(event) => form.setValue("employment_type", event.target.value as IntakeFormValues["employment_type"])}
                      >
                        {employmentTypeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Work mode</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={values.work_mode}
                        onChange={(event) => form.setValue("work_mode", event.target.value as IntakeFormValues["work_mode"])}
                      >
                        {workModeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location strictness</Label>
                      <select
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        value={values.location_strictness}
                        onChange={(event) => form.setValue("location_strictness", event.target.value as IntakeFormValues["location_strictness"])}
                      >
                        {locationStrictnessOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <ChipsInput
                    label="Allowed cities"
                    values={values.allowed_cities}
                    onAdd={(value) => updateChip("allowed_cities", value, "add")}
                    onRemove={(value) => updateChip("allowed_cities", value, "remove")}
                    placeholder="Add city"
                  />
                  <ChipsInput
                    label="Allowed countries"
                    values={values.allowed_countries}
                    onAdd={(value) => updateChip("allowed_countries", value, "add")}
                    onRemove={(value) => updateChip("allowed_countries", value, "remove")}
                    placeholder="Add country"
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={values.relocation_accepted}
                        onChange={(event) => form.setValue("relocation_accepted", event.target.checked)}
                      />
                      Relocation accepted
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label>Job description (optional)</Label>
                    <Textarea rows={6} {...form.register("job_description")} />
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="space-y-4">
                  <ChipsInput
                    label="Must-have technical skills"
                    values={values.must_have_technical_skills}
                    onAdd={(value) => updateChip("must_have_technical_skills", value, "add")}
                    onRemove={(value) => updateChip("must_have_technical_skills", value, "remove")}
                    placeholder="Add skill"
                  />
                  <ChipsInput
                    label="Must-have frameworks"
                    values={values.must_have_frameworks}
                    onAdd={(value) => updateChip("must_have_frameworks", value, "add")}
                    onRemove={(value) => updateChip("must_have_frameworks", value, "remove")}
                    placeholder="Add framework"
                  />
                  <ChipsInput
                    label="Must-have tools"
                    values={values.must_have_tools}
                    onAdd={(value) => updateChip("must_have_tools", value, "add")}
                    onRemove={(value) => updateChip("must_have_tools", value, "remove")}
                    placeholder="Add tool"
                  />

                  <div className="grid gap-4 md:grid-cols-3">
                    <ChipsInput
                      label="Nice-to-have skills"
                      values={values.nice_to_have_skills}
                      onAdd={(value) => updateChip("nice_to_have_skills", value, "add")}
                      onRemove={(value) => updateChip("nice_to_have_skills", value, "remove")}
                      placeholder="Add"
                    />
                    <ChipsInput
                      label="Nice-to-have frameworks"
                      values={values.nice_to_have_frameworks}
                      onAdd={(value) => updateChip("nice_to_have_frameworks", value, "add")}
                      onRemove={(value) => updateChip("nice_to_have_frameworks", value, "remove")}
                      placeholder="Add"
                    />
                    <ChipsInput
                      label="Nice-to-have tools"
                      values={values.nice_to_have_tools}
                      onAdd={(value) => updateChip("nice_to_have_tools", value, "add")}
                      onRemove={(value) => updateChip("nice_to_have_tools", value, "remove")}
                      placeholder="Add"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ChipsInput
                      label="Soft skills required"
                      values={values.soft_skills_required}
                      onAdd={(value) => updateChip("soft_skills_required", value, "add")}
                      onRemove={(value) => updateChip("soft_skills_required", value, "remove")}
                      placeholder="Add"
                    />
                    <ChipsInput
                      label="Soft skills preferred"
                      values={values.soft_skills_preferred}
                      onAdd={(value) => updateChip("soft_skills_preferred", value, "add")}
                      onRemove={(value) => updateChip("soft_skills_preferred", value, "remove")}
                      placeholder="Add"
                    />
                  </div>

                  <ChipsInput
                    label="Domain experience"
                    values={values.domain_experience}
                    onAdd={(value) => updateChip("domain_experience", value, "add")}
                    onRemove={(value) => updateChip("domain_experience", value, "remove")}
                    placeholder="Add domain (fintech, healthcare...)"
                  />

                  <div className="space-y-2">
                    <Label>Minimum years experience: {values.min_years_experience}</Label>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      value={values.min_years_experience}
                      onChange={(event) => form.setValue("min_years_experience", Number(event.target.value), { shouldValidate: true })}
                      className="h-2 w-full accent-primary"
                    />
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={values.career_stability_rule}
                      onChange={(event) => form.setValue("career_stability_rule", event.target.checked)}
                    />
                    Enable career stability rule
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <Card className="border-border/80 bg-background">
                    <CardHeader>
                      <CardTitle className="text-base">Required languages</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {values.required_languages.map((language, index) => (
                        <div key={`${language.language}-${index}`} className="flex items-center gap-2">
                          <Input
                            value={language.language}
                            onChange={(event) => {
                              const next = [...values.required_languages];
                              next[index] = { ...language, language: event.target.value };
                              form.setValue("required_languages", next, { shouldValidate: true });
                            }}
                            placeholder="Language"
                          />
                          <select
                            className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                            value={language.level}
                            onChange={(event) => {
                              const next = [...values.required_languages];
                              next[index] = { ...language, level: event.target.value as LanguageLevel };
                              form.setValue("required_languages", next, { shouldValidate: true });
                            }}
                          >
                            {languageLevels.map((level) => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const next = values.required_languages.filter((_, itemIndex) => itemIndex !== index);
                              form.setValue("required_languages", next, { shouldValidate: true });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          form.setValue(
                            "required_languages",
                            [...values.required_languages, { language: "", level: "professional" }],
                            { shouldValidate: true }
                          )
                        }
                      >
                        Add language
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-2">
                    <Label>Education requirement</Label>
                    <Input
                      value={values.education_requirement}
                      onChange={(event) => form.setValue("education_requirement", event.target.value)}
                      placeholder="e.g. Bachelor's in CS"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <ChipsInput
                      label="Keywords boost"
                      values={values.keywords_boost}
                      onAdd={(value) => updateChip("keywords_boost", value, "add")}
                      onRemove={(value) => updateChip("keywords_boost", value, "remove")}
                      placeholder="Add keyword"
                    />
                    <ChipsInput
                      label="Keywords penalize"
                      values={values.keywords_penalize}
                      onAdd={(value) => updateChip("keywords_penalize", value, "add")}
                      onRemove={(value) => updateChip("keywords_penalize", value, "remove")}
                      placeholder="Add keyword"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Scoring preset</Label>
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={values.scoring_preset}
                      onChange={(event) => form.setValue("scoring_preset", event.target.value as IntakeFormValues["scoring_preset"])}
                    >
                      {scoringPresetOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 rounded-md border border-border/80 bg-background p-3">
                    <Label>Hard filter toggles</Label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={values.hard_filter_toggles.reject_if_missing_must_have}
                        onChange={(event) =>
                          form.setValue("hard_filter_toggles", {
                            ...values.hard_filter_toggles,
                            reject_if_missing_must_have: event.target.checked,
                          })
                        }
                      />
                      Reject if missing must-have skills
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={values.hard_filter_toggles.reject_if_location_mismatch}
                        onChange={(event) =>
                          form.setValue("hard_filter_toggles", {
                            ...values.hard_filter_toggles,
                            reject_if_location_mismatch: event.target.checked,
                          })
                        }
                      />
                      Reject if location mismatches
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={values.hard_filter_toggles.reject_if_min_exp_not_met}
                        onChange={(event) =>
                          form.setValue("hard_filter_toggles", {
                            ...values.hard_filter_toggles,
                            reject_if_min_exp_not_met: event.target.checked,
                          })
                        }
                      />
                      Reject if minimum experience not met
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={values.hard_filter_toggles.reject_if_missing_language}
                        onChange={(event) =>
                          form.setValue("hard_filter_toggles", {
                            ...values.hard_filter_toggles,
                            reject_if_missing_language: event.target.checked,
                          })
                        }
                      />
                      Reject if missing required language
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={() => setStep((previous) => Math.max(0, previous - 1))} disabled={step === 0 || isSubmitting}>
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/jobs")} disabled={isSubmitting}>
                    Cancel
                  </Button>

                  {step < 2 ? (
                    <Button type="button" onClick={onNextStep}>
                      Next step
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Create Job with Structured Intake
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
