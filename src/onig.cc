/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

#include <cstdlib>
#include <cstdio>
#include <cstring>
#include "oniguruma.h"
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS(vscode_oniguruma) {
  emscripten::constant("ONIG_OPTION_DEFAULT", ONIG_OPTION_DEFAULT);
  emscripten::constant("ONIG_OPTION_NONE", ONIG_OPTION_NONE);
  emscripten::constant("ONIG_OPTION_IGNORECASE", ONIG_OPTION_IGNORECASE);
  emscripten::constant("ONIG_OPTION_EXTEND", ONIG_OPTION_EXTEND);
  emscripten::constant("ONIG_OPTION_MULTILINE", ONIG_OPTION_MULTILINE);
  emscripten::constant("ONIG_OPTION_SINGLELINE", ONIG_OPTION_SINGLELINE);
  emscripten::constant("ONIG_OPTION_FIND_LONGEST", ONIG_OPTION_FIND_LONGEST);
  emscripten::constant("ONIG_OPTION_FIND_NOT_EMPTY", ONIG_OPTION_FIND_NOT_EMPTY);
  emscripten::constant("ONIG_OPTION_NEGATE_SINGLELINE", ONIG_OPTION_NEGATE_SINGLELINE);
  emscripten::constant("ONIG_OPTION_DONT_CAPTURE_GROUP", ONIG_OPTION_DONT_CAPTURE_GROUP);
  emscripten::constant("ONIG_OPTION_CAPTURE_GROUP", ONIG_OPTION_CAPTURE_GROUP);
  emscripten::constant("ONIG_OPTION_NOTBOL", ONIG_OPTION_NOTBOL);
  emscripten::constant("ONIG_OPTION_NOTEOL", ONIG_OPTION_NOTEOL);
  emscripten::constant("ONIG_OPTION_POSIX_REGION", ONIG_OPTION_POSIX_REGION);
  emscripten::constant("ONIG_OPTION_CHECK_VALIDITY_OF_STRING", ONIG_OPTION_CHECK_VALIDITY_OF_STRING);
  emscripten::constant("ONIG_OPTION_IGNORECASE_IS_ASCII", ONIG_OPTION_IGNORECASE_IS_ASCII);
  emscripten::constant("ONIG_OPTION_WORD_IS_ASCII", ONIG_OPTION_WORD_IS_ASCII);
  emscripten::constant("ONIG_OPTION_DIGIT_IS_ASCII", ONIG_OPTION_DIGIT_IS_ASCII);
  emscripten::constant("ONIG_OPTION_SPACE_IS_ASCII", ONIG_OPTION_SPACE_IS_ASCII);
  emscripten::constant("ONIG_OPTION_POSIX_IS_ASCII", ONIG_OPTION_POSIX_IS_ASCII);
  emscripten::constant("ONIG_OPTION_TEXT_SEGMENT_EXTENDED_GRAPHEME_CLUSTER", ONIG_OPTION_TEXT_SEGMENT_EXTENDED_GRAPHEME_CLUSTER);
  emscripten::constant("ONIG_OPTION_TEXT_SEGMENT_WORD", ONIG_OPTION_TEXT_SEGMENT_WORD);
  emscripten::constant("ONIG_OPTION_NOT_BEGIN_STRING", ONIG_OPTION_NOT_BEGIN_STRING);
  emscripten::constant("ONIG_OPTION_NOT_END_STRING", ONIG_OPTION_NOT_END_STRING);
  emscripten::constant("ONIG_OPTION_NOT_BEGIN_POSITION", ONIG_OPTION_NOT_BEGIN_POSITION);
  emscripten::constant("ONIG_OPTION_CALLBACK_EACH_MATCH", ONIG_OPTION_CALLBACK_EACH_MATCH);
  emscripten::constant("ONIG_OPTION_MAXBIT", ONIG_OPTION_MAXBIT);

  emscripten::constant("ONIG_SYNTAX_DEFAULT", (unsigned int)ONIG_SYNTAX_DEFAULT);
  emscripten::constant("ONIG_SYNTAX_ASIS", (unsigned int)ONIG_SYNTAX_ASIS);
  emscripten::constant("ONIG_SYNTAX_POSIX_BASIC", (unsigned int)ONIG_SYNTAX_POSIX_BASIC);
  emscripten::constant("ONIG_SYNTAX_POSIX_EXTENDED", (unsigned int)ONIG_SYNTAX_POSIX_EXTENDED);
  emscripten::constant("ONIG_SYNTAX_EMACS", (unsigned int)ONIG_SYNTAX_EMACS);
  emscripten::constant("ONIG_SYNTAX_GREP", (unsigned int)ONIG_SYNTAX_GREP);
  emscripten::constant("ONIG_SYNTAX_GNU_REGEX", (unsigned int)ONIG_SYNTAX_GNU_REGEX);
  emscripten::constant("ONIG_SYNTAX_JAVA", (unsigned int)ONIG_SYNTAX_JAVA);
  emscripten::constant("ONIG_SYNTAX_PERL", (unsigned int)ONIG_SYNTAX_PERL);
  emscripten::constant("ONIG_SYNTAX_PERL_NG", (unsigned int)ONIG_SYNTAX_PERL_NG);
  emscripten::constant("ONIG_SYNTAX_RUBY", (unsigned int)ONIG_SYNTAX_RUBY);
  emscripten::constant("ONIG_SYNTAX_PYTHON", (unsigned int)ONIG_SYNTAX_PYTHON);
  emscripten::constant("ONIG_SYNTAX_ONIGURUMA", (unsigned int)ONIG_SYNTAX_ONIGURUMA);
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
char* omalloc(int count)
{
  return (char*)malloc(count);
}

EMSCRIPTEN_KEEPALIVE
void ofree(char* ptr)
{
  free(ptr);
}

typedef struct OnigRegExp_ {
  unsigned char* strData;
  int strLength;
  regex_t* regex;
  OnigRegion* region;
  bool hasGAnchor;
  int lastSearchStrCacheId;
  int lastSearchPosition;
  int lastSearchOnigOption;
  bool lastSearchMatched;
} OnigRegExp;

typedef struct OnigScanner_ {
  OnigRegSet* rset;
  OnigRegExp** regexes;
  int count;
} OnigScanner;

typedef struct OnigGroupNumbers_ {
  int count;
  int* numbers;
} OnigGroupNumbers;

typedef struct OnigGroups_ {
  int count;
  unsigned char** names;
  OnigGroupNumbers* groupNumbers;
} OnigGroups;

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

OnigRegExp* createOnigRegExp(unsigned char* data, int length, int options, OnigSyntaxType* syntax) {
  OnigRegExp* result;
  regex_t* regex;

  lastOnigStatus = onig_new(&regex, data, data + length,
                            options, ONIG_ENCODING_UTF8,
                            syntax, &lastOnigErrorInfo);

  if (lastOnigStatus != ONIG_NORMAL) {
    return NULL;
  }

  result = (OnigRegExp*)malloc(sizeof(OnigRegExp));
  result->strLength = length;
  result->strData = (unsigned char*)malloc(length);
  memcpy(result->strData, data, length);
  result->regex = regex;
  result->region = onig_region_new();
  result->hasGAnchor = hasGAnchor(data, length);
  result->lastSearchStrCacheId = 0;
  result->lastSearchPosition = 0;
  result->lastSearchOnigOption = ONIG_OPTION_NONE;
  result->lastSearchMatched = false;
  return result;
}

void freeOnigRegExp(OnigRegExp* regex) {
  // regex->regex will be freed separately / as part of the regset
  free(regex->strData);
  onig_region_free(regex->region, 1);
  free(regex);
}

OnigRegion* _searchOnigRegExp(OnigRegExp* regex, unsigned char* strData, int strLength, int position, OnigOptionType onigOption) {
  int status;

  status = onig_search(regex->regex, strData, strData + strLength,
                       strData + position, strData + strLength,
                       regex->region, onigOption);

  if (status == ONIG_MISMATCH || status < 0) {
    regex->lastSearchMatched = false;
    return NULL;
  }

  regex->lastSearchMatched = true;
  return regex->region;
}

OnigRegion* searchOnigRegExp(OnigRegExp* regex, int strCacheId, unsigned char* strData, int strLength, int position, OnigOptionType onigOption) {
  if (regex->hasGAnchor) {
    // Should not use caching, because the regular expression
    // targets the current search position (\G)
    return _searchOnigRegExp(regex, strData, strLength, position, onigOption);
  }

  if (regex->lastSearchStrCacheId == strCacheId && regex->lastSearchOnigOption == onigOption && regex->lastSearchPosition <= position) {
    if (!regex->lastSearchMatched) {
      // last time there was no match
      return NULL;
    }
    if (regex->region->beg[0] >= position) {
      // last time there was a match and it occured after position
      return regex->region;
    }
  }

  regex->lastSearchStrCacheId = strCacheId;
  regex->lastSearchPosition = position;
  regex->lastSearchOnigOption = onigOption;
  return _searchOnigRegExp(regex, strData, strLength, position, onigOption);
}

#pragma endregion

#pragma region OnigScanner

EMSCRIPTEN_KEEPALIVE
int createOnigScanner(unsigned char** patterns, int* lengths, int count, int options, OnigSyntaxType* syntax) {
  int i, j;
  OnigRegExp** regexes;
  regex_t** regs;
  OnigRegSet* rset;
  OnigScanner* scanner;

  regexes = (OnigRegExp**)malloc(sizeof(OnigRegExp*) * count);
  regs = (regex_t**)malloc(sizeof(regex_t*) * count);

  for (i = 0; i < count; i++) {
    regexes[i] = createOnigRegExp(patterns[i], lengths[i], options, syntax);
    if (regexes[i] != NULL) {
      regs[i] = regexes[i]->regex;
    } else {
      // parsing this regex failed, so clean up all the ones created so far
      for (j = 0; j < i; j++) {
        free(regs[j]);
        freeOnigRegExp(regexes[j]);
      }
      free(regexes);
      free(regs);
      return 0;
    }
  }

  onig_regset_new(&rset, count, regs);
  free(regs);

  scanner = (OnigScanner*)malloc(sizeof(OnigScanner));
  scanner->rset = rset;
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
  onig_regset_free(scanner->rset);
  free(scanner);
  return 0;
}

EMSCRIPTEN_KEEPALIVE
int findNextOnigScannerMatch(OnigScanner* scanner, int strCacheId, unsigned char* strData, int strLength, int position, int options) {
  int bestLocation = 0;
  int bestResultIndex = 0;
  OnigRegion* bestResult = NULL;
  OnigRegion* result;
  int i;
  int location;

  if (strLength < 1000) {
    // for short strings, it is better to use the RegSet API, but for longer strings caching pays off
    bestResultIndex = onig_regset_search(scanner->rset, strData, strData + strLength, strData + position, strData + strLength,
                                         ONIG_REGSET_POSITION_LEAD, options, &bestLocation);
    if (bestResultIndex < 0) {
      return 0;
    }
    return encodeOnigRegion(onig_regset_get_region(scanner->rset, bestResultIndex), bestResultIndex);
  }

  for (i = 0; i < scanner->count; i++) {
    result = searchOnigRegExp(scanner->regexes[i], strCacheId, strData, strLength, position, options);
    if (result != NULL && result->num_regs > 0) {
      location = result->beg[0];

      if (bestResult == NULL || location < bestLocation) {
        bestLocation = location;
        bestResult = result;
        bestResultIndex = i;
      }

      if (location == position) {
        break;
      }
    }
  }

  if (bestResult == NULL) {
    return 0;
  }

  return encodeOnigRegion(bestResult, bestResultIndex);
}

EMSCRIPTEN_KEEPALIVE
int findNextOnigScannerMatchDbg(OnigScanner* scanner, int strCacheId, unsigned char* strData, int strLength, int position, int options) {
  printf("\n~~~~~~~~~~~~~~~~~~~~\nEntering findNextOnigScannerMatch:%.*s\n", strLength, strData);
  int bestLocation = 0;
  int bestResultIndex = 0;
  OnigRegion* bestResult = NULL;
  OnigRegion* result;
  int i;
  int location;
  double startTime;
  double elapsedTime;

  for (i = 0; i < scanner->count; i++) {
    printf("- searchOnigRegExp: %.*s\n", scanner->regexes[i]->strLength, scanner->regexes[i]->strData);
    startTime = emscripten_get_now();
    result = searchOnigRegExp(scanner->regexes[i], strCacheId, strData, strLength, position, options);
    elapsedTime = emscripten_get_now() - startTime;
    if (result != NULL && result->num_regs > 0) {
      location = result->beg[0];
      printf("|- matched after %.3f ms at byte offset %d\n", elapsedTime, location);

      if (bestResult == NULL || location < bestLocation) {
        bestLocation = location;
        bestResult = result;
        bestResultIndex = i;
      }

      if (location == position) {
        break;
      }
    } else {
      printf("|- did not match after %.3f ms\n", elapsedTime);
    }
  }

  printf("Leaving findNextOnigScannerMatch\n\n");

  if (bestResult == NULL) {
    return 0;
  }

  return encodeOnigRegion(bestResult, bestResultIndex);
}

int nameCallback(const UChar* name, const UChar* nameEnd, int groupNumCount, int* groupNums, regex_t* reg, void* arg) {
  OnigGroups* groups = (OnigGroups*)arg;
  int nextGroupIndex = groups->count++;

  unsigned char* nameStr = (unsigned char*)malloc((nameEnd - name) + 1);
  strncpy((char*)nameStr, (char*)name, nameEnd - name);
  nameStr[nameEnd - name] = '\0';
  groups->names[nextGroupIndex] = nameStr;

  int* groupNumbers = (int*)malloc(sizeof(int) * groupNumCount);
  memcpy(groupNumbers, groupNums, sizeof(int) * groupNumCount);
  groups->groupNumbers[nextGroupIndex].count = groupNumCount;
  groups->groupNumbers[nextGroupIndex].numbers = groupNumbers;

  return 0;
}

EMSCRIPTEN_KEEPALIVE
OnigGroups* groupsToNumber(OnigScanner* scanner, int patternIndex) {
  regex_t* regex = scanner->regexes[patternIndex]->regex;
  int numOfNames = onig_number_of_names(regex);

  OnigGroups* groups = (OnigGroups*)malloc(sizeof(OnigGroups));
  groups->count = 0;
  groups->names = (unsigned char**)malloc(sizeof(unsigned char*) * numOfNames);
  groups->groupNumbers = (OnigGroupNumbers*)malloc(sizeof(OnigGroupNumbers) * numOfNames);

  memset(groups->names, 0, sizeof(unsigned char*) * numOfNames);
  memset(groups->groupNumbers, 0, sizeof(OnigGroupNumbers*) * numOfNames);

  onig_foreach_name(regex, nameCallback, (void*)groups);

  return groups;
}

EMSCRIPTEN_KEEPALIVE
void freeOnigGroups(OnigGroups* groups) {
  int i;
  for (i = 0; i < groups->count; i++) {
    free(groups->names[i]);
    free(groups->groupNumbers[i].numbers);
  }
  free(groups->names);
  free(groups->groupNumbers);
  free(groups);
}

#pragma endregion

}
