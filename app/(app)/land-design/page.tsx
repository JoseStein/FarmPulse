import { LandDesignView } from "@/components/land-design-view";
import { PageHeader } from "@/components/ui";
import { getLandDesignData } from "@/lib/data/queries";

export const metadata = { title: "Land design" };

export default async function LandDesignPage() {
  const data = await getLandDesignData();
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8">
      <PageHeader
        eyebrow="Official planning reference"
        title="Farm land and irrigation design"
        description="The May 2024 design translated into FarmPulse as planned infrastructure, production lots, irrigation relationships, coordinates, and field-verification requirements."
      />
      <LandDesignView design={data.design} fields={data.fields} persisted={data.persisted} />
    </div>
  );
}
