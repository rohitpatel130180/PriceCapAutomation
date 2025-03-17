import { test } from "@playwright/test";
export function annotate(annotation: string): string {
    test.info().annotations.push({
        type: annotation,
    });

    return annotation;
}
