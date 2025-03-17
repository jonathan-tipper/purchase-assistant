
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const HelpTutorial = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Help & Tutorial</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Learn how to use the Purchase Value Calculator to make better buying decisions.
        </p>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>How to add a new purchase</AccordionTrigger>
            <AccordionContent>
              Click the "Add Item" button in the purchase items section. Give your item a name, then configure details like price, expected lifespan, and usage frequency. Click "Save" to store your item.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-2">
            <AccordionTrigger>Understanding Cost Per Use</AccordionTrigger>
            <AccordionContent>
              Cost Per Use is calculated by dividing the total price by the number of times you'll use the item over its lifespan. The lower this number, the more value you get from each use.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-3">
            <AccordionTrigger>What is Depreciation Rate?</AccordionTrigger>
            <AccordionContent>
              The depreciation rate represents how quickly an item loses value over time. A higher rate means the item loses value faster. This helps calculate the real cost of ownership over time.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-4">
            <AccordionTrigger>Comparing Multiple Items</AccordionTrigger>
            <AccordionContent>
              Create multiple items to compare their value. The comparison table (available in the menu) shows all your items side-by-side, making it easy to see which purchases offer the best value.
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="item-5">
            <AccordionTrigger>Exporting Your Data</AccordionTrigger>
            <AccordionContent>
              To save or share your calculations, use the Export Data option in the menu. You can download your data in JSON or CSV format for use in spreadsheets or other applications.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default HelpTutorial;
