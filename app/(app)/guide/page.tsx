import {GuideView} from "@/components/guide-view";
import {getGuidePageData} from "@/lib/data/queries";

export const metadata={title:"Crop guide"};
export default async function GuidePage(){return <GuideView data={await getGuidePageData()}/>;}
