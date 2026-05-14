type VerifyEmailSearchParams = {
  mode?: string | string[];
  oobCode?: string | string[];
  continueUrl?: string | string[];
  link?: string | string[];
};

type VerifyEmailRouteParams = {
  mode?: string;
  oobCode?: string;
};

function getFirstQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function extractNestedVerifyEmailParams(urlValue?: string | string[]) {
  const url = getFirstQueryValue(urlValue);

  if (!url) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    return {
      mode: parsedUrl.searchParams.get("mode") ?? undefined,
      oobCode: parsedUrl.searchParams.get("oobCode") ?? undefined,
    };
  } catch {
    return null;
  }
}

export function resolveVerifyEmailParams(
  searchParams: VerifyEmailSearchParams,
): VerifyEmailRouteParams {
  const mode = getFirstQueryValue(searchParams.mode);
  const oobCode = getFirstQueryValue(searchParams.oobCode);

  if (mode || oobCode) {
    return { mode, oobCode };
  }

  const nestedLinkParams =
    extractNestedVerifyEmailParams(searchParams.link) ??
    extractNestedVerifyEmailParams(searchParams.continueUrl);

  if (nestedLinkParams) {
    return nestedLinkParams;
  }

  return {};
}
