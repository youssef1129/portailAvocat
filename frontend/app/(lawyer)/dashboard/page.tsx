import React from "react";
import { PrimaryButton } from "../../../components/ui";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <PrimaryButton onClick={() => alert("Créer une nouvelle demande (placeholder)")}>Nouvelle demande</PrimaryButton>
      </div>

      <div className="bg-white p-6 rounded-md shadow-sm">
        <p className="text-gray-600">Aucune donnée — intégration API à venir.</p>
      </div>
    </div>
  );
}
