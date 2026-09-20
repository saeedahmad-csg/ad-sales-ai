import { NextResponse } from "next/server";
import { runPrediction, computeDiminishingReturns } from "@/lib/polynomialModel";
import modelCoefficients from "@/data/model_coefficients.json";
import modelStats from "@/data/model_stats.json";

export async function POST(request: Request) {
  try {
    const { tv, radio, newspaper } = await request.json();

    if (
      typeof tv !== "number" ||
      typeof radio !== "number" ||
      typeof newspaper !== "number"
    ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = runPrediction(tv, radio, newspaper, modelCoefficients);

    // Compute diminishing returns for each channel at the fixed other values
    const fixed = { tv, radio, newspaper };
    const drTV = computeDiminishingReturns("TV", modelCoefficients, fixed);
    const drRadio = computeDiminishingReturns("Radio", modelCoefficients, fixed);
    const drNewspaper = computeDiminishingReturns("Newspaper", modelCoefficients, fixed);

    return NextResponse.json({
      ...result,
      diminishing_returns: { TV: drTV, Radio: drRadio, Newspaper: drNewspaper },
      model_stats: modelStats.performance,
    });
  } catch (error) {
    return NextResponse.json({ error: "Prediction failed" }, { status: 500 });
  }
}
