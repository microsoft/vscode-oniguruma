/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

#include <cstdlib>
#include "oniguruma.h"
#include <emscripten/emscripten.h>

extern "C" {

typedef struct OnigString_ {
  unsigned char* data;
  int length;
  int uniqueId;
} OnigString;

typedef struct OnigRegExp_ {
  regex_t* regex;
  bool hasGAnchor;
  int lastSearchStrUniqueId;
  int lastSearchPosition;
  OnigRegion* lastSearchResult;
  bool lastSearchResultMatched;
} OnigRegExp;

typedef struct OnigScanner_ {
  OnigRegExp** regexes;
  int count;
} OnigScanner;

int lastOnigStatus = 0;
OnigErrorInfo lastOnigErrorInfo;

EMSCRIPTEN_KEEPALIVE
char* getLastOnigError()
{
  static char s[ONIG_MAX_ERROR_MESSAGE_LEN];
  onig_error_code_to_str((UChar*)s, lastOnigStatus, &lastOnigErrorInfo);
  return s;
}

#define MAX_REGIONS 1000

int encodeOnigRegion(OnigRegion *result, int index) {
  static int encodedResult[2 * (1 + MAX_REGIONS)];
  int i;
  if (result == NULL || result->num_regs > MAX_REGIONS) {
    return 0;
  }

  encodedResult[0] = index;
  encodedResult[1] = result->num_regs;
  for (i = 0; i < result->num_regs; i++) {
    encodedResult[2 * i + 2] = result->beg[i];
    encodedResult[2 * i + 3] = result->end[i];
  }
  return (int)encodedResult;
}

#pragma region OnigString

EMSCRIPTEN_KEEPALIVE
int createOnigString(unsigned char* data, int length) {
  static int idGenerator = 0;
  OnigString* result;

  result = (OnigString*)malloc(sizeof(OnigString));
  result->data = data;
  result->length = length;
  result->uniqueId = ++idGenerator;
  return (int)result;
}

EMSCRIPTEN_KEEPALIVE
int freeOnigString(OnigString* str) {
  free(str);
  return 0;
}

#pragma endregion

#pragma region OnigRegExp

bool hasGAnchor(unsigned char* str, int len) {
  int pos;
  for (pos = 0; pos < len; pos++) {
    if (str[pos] == '\\' && pos + 1 < len) {
      if (str[pos + 1] == 'G') {
        return true;
      }
    }
  }
  return false;
}

OnigRegExp* createOnigRegExp(unsigned char* data, int length) {
  OnigRegExp* result;
  regex_t* regex;

  lastOnigStatus = onig_new(&regex, data, data + length,
                            ONIG_OPTION_CAPTURE_GROUP, ONIG_ENCODING_UTF8,
                            ONIG_SYNTAX_DEFAULT, &lastOnigErrorInfo);

  if (lastOnigStatus != ONIG_NORMAL) {
    return NULL;
  }

  result = (OnigRegExp*)malloc(sizeof(OnigRegExp));
  result->regex = regex;
  result->hasGAnchor = hasGAnchor(data, length);
  result->lastSearchStrUniqueId = 0;
  result->lastSearchPosition = 0;
  result->lastSearchResult = onig_region_new();
  result->lastSearchResultMatched = false;
  return result;
}

void freeOnigRegExp(OnigRegExp* regex) {
  onig_free(regex->regex);
  onig_region_free(regex->lastSearchResult, 1);
  free(regex);
}

OnigRegion* _searchOnigRegExp(OnigRegExp* regex, OnigString* str, int position) {
  int status;

  status = onig_search(regex->regex, str->data, str->data + str->length,
                       str->data + position, str->data + str->length,
                       regex->lastSearchResult, ONIG_OPTION_NONE);

  if (status == ONIG_MISMATCH || status < 0) {
    regex->lastSearchResultMatched = false;
    return NULL;
  }

  regex->lastSearchResultMatched = true;
  return regex->lastSearchResult;
}

OnigRegion* searchOnigRegExp(OnigRegExp* regex, OnigString* str, int position) {
  if (regex->hasGAnchor) {
    // Should not use caching, because the regular expression
    // targets the current search position (\G)
    return _searchOnigRegExp(regex, str, position);
  }

  if (regex->lastSearchStrUniqueId == str->uniqueId && regex->lastSearchPosition <= position) {
    if (!regex->lastSearchResultMatched) {
      // last time there was no match
      return NULL;
    }
    if (regex->lastSearchResult->beg[0] >= position) {
      // last time there was a match and it occured after position
      return regex->lastSearchResult;
    }
  }

  regex->lastSearchStrUniqueId = str->uniqueId;
  regex->lastSearchPosition = position;
  return _searchOnigRegExp(regex, str, position);
}

#pragma endregion

#pragma region OnigScanner

EMSCRIPTEN_KEEPALIVE
int createOnigScanner(unsigned char** patterns, int* lengths, int count) {
  int i, j;
  OnigRegExp** regexes;
  OnigScanner* scanner;

  regexes = (OnigRegExp**)malloc(sizeof(OnigRegExp*) * count);

  for (i = 0; i < count; i++) {
    regexes[i] = createOnigRegExp(patterns[i], lengths[i]);
    if (regexes[i] == NULL) {
      for (j = 0; j < i; j++) {
        freeOnigRegExp(regexes[i]);
      }
      free(regexes);
      return 0;
    }
  }

  scanner = (OnigScanner*)malloc(sizeof(OnigScanner));
  scanner->regexes = regexes;
  scanner->count = count;
  return (int)scanner;
}

EMSCRIPTEN_KEEPALIVE
int freeOnigScanner(OnigScanner* scanner) {
  int i;
  for (i = 0 ; i < scanner->count; i++) {
    freeOnigRegExp(scanner->regexes[i]);
  }
  free(scanner->regexes);
  free(scanner);
  return 0;
}

EMSCRIPTEN_KEEPALIVE
int findNextOnigScannerMatch(OnigScanner* scanner, OnigString* str, int startPosition) {
  int bestLocation = 0;
  int bestResultIndex = 0;
  OnigRegion* bestResult = NULL;
  OnigRegion* result;
  int i;
  int location;

  for (i = 0; i < scanner->count; i++) {
    result = searchOnigRegExp(scanner->regexes[i], str, startPosition);
    if (result != NULL && result->num_regs > 0) {
      location = result->beg[0];

      if (bestResult == NULL || location < bestLocation) {
        bestLocation = location;
        bestResult = result;
        bestResultIndex = i;
      }

      if (location == startPosition) {
        break;
      }
    }
  }

  if (bestResult == NULL) {
    return 0;
  }

  return encodeOnigRegion(bestResult, bestResultIndex);
}

#pragma endregion

#pragma region OnigRegSet

void freeRegs(regex_t** regs, int count) {
  int i;
  for (i = 0; i < count; i++) {
    onig_free(regs[i]);
  }
  free(regs);
}

EMSCRIPTEN_KEEPALIVE
int createOnigRegSet(unsigned char** patterns, int* lengths, int count) {
  int i;
  regex_t** regs;
  OnigRegSet* rset;

  regs = (regex_t**)malloc(sizeof(regex_t*) * count);

  for (i = 0; i < count; i++) {
    lastOnigStatus = onig_new(&(regs[i]), patterns[i], patterns[i] + lengths[i],
                              ONIG_OPTION_CAPTURE_GROUP, ONIG_ENCODING_UTF8,
                              ONIG_SYNTAX_DEFAULT, &lastOnigErrorInfo);
    if (lastOnigStatus != ONIG_NORMAL) {
      freeRegs(regs, i);
      return 0;
    }
  }

  onig_regset_new(&rset, count, regs);
  free(regs);
  return (int)rset;
}

EMSCRIPTEN_KEEPALIVE
void freeOnigRegSet(OnigRegSet* rset) {
  onig_regset_free(rset);
}

EMSCRIPTEN_KEEPALIVE
int findNextOnigRegSetMatch(OnigRegSet* rset, unsigned char* data, int length, int position) {
  int status;
  int rmatch_pos;
  OnigRegion* result;

  status = onig_regset_search(rset, data, data + length, data + position, data + length,
                              ONIG_REGSET_POSITION_LEAD, ONIG_OPTION_NONE, &rmatch_pos);

  if (status < 0) {
    return 0;
  }

  return encodeOnigRegion(onig_regset_get_region(rset, status), status);
}

#pragma endregion

}
