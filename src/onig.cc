/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

#include <cstdlib>
#include "oniguruma.h"
#include <emscripten/emscripten.h>

extern "C" {

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
