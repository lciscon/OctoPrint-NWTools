#pragma once

void errmsg(const char *, ...);
void errxit(const char *, ...);
void db_printf(const char *, ...);
void set_debug(bool state);
bool debug_on();
