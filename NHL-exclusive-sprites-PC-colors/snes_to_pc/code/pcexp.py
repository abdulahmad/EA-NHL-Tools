import sys,numpy as np
sys.path[:0]=[
  '/workspace/g94-to-pc-zones/v5/final3l/work','/workspace/g94-to-pc-zones/v5/final3j/work',
  '/workspace/g94-to-pc-zones/v5/final3j/exclusive/fight','/workspace/g94-to-pc-zones/v5/final3c/work',
  '/workspace/g94-to-pc-zones/v4/work','/workspace/wt-exclusive/NHL-exclusive-sprites-PC-colors/tools']
import eval_and_build as EB
from eval_and_build import convert_93, spit_rt, png_rt, init_valid, A as AP, SH
from teams import teamact
from build_fight import paint
BOS=teamact('bos','h')
init_valid()
