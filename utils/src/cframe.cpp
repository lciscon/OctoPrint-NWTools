#include <stdlib.h>
#include <stdio.h>
#include <stdarg.h>
#include "string.h"

#include "frame.h"

static bool debug_state=false;

void
errmsg(const char* fmt, ...)
	{
	va_list	ap;

	va_start(ap, fmt);
	vfprintf(stderr, fmt, ap);
	va_end(ap);
	}

void
errxit(const char* fmt, ...)
	{
	va_list	ap;

	va_start(ap, fmt);
	vfprintf(stderr, fmt, ap);
	va_end(ap);

	exit(1);
	}

void
set_debug(bool state)
	{
	debug_state=state;
	}

bool
debug_on()
	{
	return(debug_state);
	}

void
db_printf(const char* fmt, ...)
	{
	va_list	ap;

	if(!debug_state)
		return;
	va_start(ap, fmt);
	vfprintf(stdout, fmt, ap);
	fprintf(stdout,"\n");
	va_end(ap);
	}
